require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serves your html / style.css / script.js folders

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "feedback",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

const wrap = fn => (req, res) =>
  fn(req, res).catch(err => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  });

// Group flat Feedback+Response rows into one object per feedback (shape the frontend expects)
function groupFeedback(rows, maskAnonymous) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.feedback_id)) {
      const hide = maskAnonymous && r.is_anonymous;
      map.set(r.feedback_id, {
        feedback_id: r.feedback_id,
        student_id: hide ? null : r.student_id,
        student: hide ? "Anonymous" : r.student_name,
        offering_id: r.offering_id,
        course: r.course_name,
        courseCode: r.course_code,
        faculty: r.faculty_name,
        date: r.sub_date,
        anonymous: !!r.is_anonymous,
        ratings: [],
        comment: ""
      });
    }
    const f = map.get(r.feedback_id);
    f.ratings.push(r.rating);
    if (r.comment) f.comment = r.comment;
  }
  return [...map.values()].map(f => ({
    ...f,
    rating: (f.ratings.reduce((a, b) => a + b, 0) / f.ratings.length).toFixed(1)
  }));
}

const FEEDBACK_SQL = `
  SELECT f.feedback_id, f.sub_date, f.is_anonymous, f.student_id, s.name AS student_name,
         f.offering_id, c.course_name, c.course_code, fa.faculty_name,
         r.question_id, r.rating, r.comment
  FROM Feedback f
  JOIN Student s ON s.student_id = f.student_id
  JOIN Course_Offering o ON o.offering_id = f.offering_id
  JOIN Course c ON c.course_id = o.course_id
  JOIN Faculty fa ON fa.faculty_id = o.faculty_id
  JOIN Response r ON r.feedback_id = f.feedback_id`;

// ---- Initial data for the student portal ----
app.get("/api/init/:studentId", wrap(async (req, res) => {
  const [students] = await pool.query("SELECT * FROM Student WHERE student_id = ?", [req.params.studentId]);
  if (!students.length) return res.status(404).json({ error: "Student not found" });

  const [offerings] = await pool.query(`
    SELECT o.offering_id, o.acad_year, c.course_id, c.course_name, c.course_code, c.credits,
           fa.faculty_id, fa.faculty_name
    FROM Course_Offering o
    JOIN Course c ON c.course_id = o.course_id
    JOIN Faculty fa ON fa.faculty_id = o.faculty_id
    ORDER BY o.offering_id`);
  const [questions] = await pool.query("SELECT * FROM Question ORDER BY question_id");
  const [forms] = await pool.query("SELECT * FROM Feedback_Form WHERE status = 'ACTIVE' ORDER BY form_id LIMIT 1");

  res.json({ student: students[0], offerings, questions, form: forms[0] || null });
}));

// ---- Student: own feedback history ----
app.get("/api/feedback", wrap(async (req, res) => {
  const { student_id } = req.query;
  if (!student_id) return res.status(400).json({ error: "student_id required" });
  const [rows] = await pool.query(
    FEEDBACK_SQL + " WHERE f.student_id = ? ORDER BY f.feedback_id, r.question_id", [student_id]);
  res.json(groupFeedback(rows, false));
}));

// ---- Student: submit feedback ----
app.post("/api/feedback", wrap(async (req, res) => {
  const { student_id, offering_id, form_id, is_anonymous, ratings, comment } = req.body;

  if (!student_id || !offering_id || !form_id)
    return res.status(400).json({ error: "Missing student, course or form" });
  if (!Array.isArray(ratings) || ratings.length === 0 ||
      ratings.some(r => !Number.isInteger(r.question_id) || !Number.isInteger(r.rating) || r.rating < 1 || r.rating > 10))
    return res.status(400).json({ error: "Ratings must be whole numbers from 1 to 10" });

  const [forms] = await pool.query("SELECT status FROM Feedback_Form WHERE form_id = ?", [form_id]);
  if (!forms.length || forms[0].status !== "ACTIVE")
    return res.status(400).json({ error: "This feedback form is closed" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [fb] = await conn.query(
      "INSERT INTO Feedback (sub_date, is_anonymous, student_id, offering_id, form_id) VALUES (CURDATE(), ?, ?, ?, ?)",
      [is_anonymous ? 1 : 0, student_id, offering_id, form_id]);

    const text = String(comment || "").trim() || null;
    const values = ratings.map((r, i) => [r.rating, i === ratings.length - 1 ? text : null, fb.insertId, r.question_id]);
    await conn.query("INSERT INTO Response (rating, comment, feedback_id, question_id) VALUES ?", [values]);

    await conn.commit();
    res.status(201).json({ feedback_id: fb.insertId });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_NO_REFERENCED_ROW_2")
      return res.status(400).json({ error: "Invalid student, course or question" });
    throw err;
  } finally {
    conn.release();
  }
}));

// ---- Admin: all feedback (anonymous names are hidden here) ----
app.get("/api/admin/feedback", wrap(async (req, res) => {
  const [rows] = await pool.query(FEEDBACK_SQL + " ORDER BY f.feedback_id, r.question_id");
  res.json(groupFeedback(rows, true));
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
