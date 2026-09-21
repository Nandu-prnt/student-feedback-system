import os
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, abort
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

load_dotenv()
BASE = os.path.dirname(os.path.abspath(__file__))
STATIC_FOLDERS = {"html", "style.css", "script.js"}  # only these folders are served

app = Flask(__name__)
CORS(app)


def get_conn():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "feedback"),
        charset="utf8mb4",
        cursorclass=DictCursor,
    )


def query(sql, params=None):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        conn.close()


FEEDBACK_SQL = """
  SELECT f.feedback_id, f.sub_date, f.is_anonymous, f.student_id, s.name AS student_name,
         f.offering_id, c.course_name, c.course_code, fa.faculty_name,
         r.question_id, r.rating, r.comment
  FROM Feedback f
  JOIN Student s ON s.student_id = f.student_id
  JOIN Course_Offering o ON o.offering_id = f.offering_id
  JOIN Course c ON c.course_id = o.course_id
  JOIN Faculty fa ON fa.faculty_id = o.faculty_id
  JOIN Response r ON r.feedback_id = f.feedback_id
"""


def group_feedback(rows, mask_anonymous):
    """Turn flat Feedback+Response rows into one object per feedback."""
    grouped = {}
    for r in rows:
        fid = r["feedback_id"]
        if fid not in grouped:
            hide = mask_anonymous and r["is_anonymous"]
            grouped[fid] = {
                "feedback_id": fid,
                "student_id": None if hide else r["student_id"],
                "student": "Anonymous" if hide else r["student_name"],
                "offering_id": r["offering_id"],
                "course": r["course_name"],
                "courseCode": r["course_code"],
                "faculty": r["faculty_name"],
                "date": str(r["sub_date"]),
                "anonymous": bool(r["is_anonymous"]),
                "ratings": [],
                "comment": "",
            }
        if r["rating"] is not None and 1 <= r["question_id"] <= 5:
            grouped[fid]["ratings"].append(r["rating"])
        if r["comment"]:
            grouped[fid]["comment"] = r["comment"]

    result = []
    for f in grouped.values():
        if len(f["ratings"]) != 5:
            continue  # skip old or incomplete records
        f["rating"] = f"{sum(f['ratings']) / len(f['ratings']):.1f}"
        result.append(f)
    return result


# ---- Initial data for the student portal ----
@app.get("/api/init/<int:student_id>")
def init(student_id):
    students = query("SELECT * FROM Student WHERE student_id = %s", (student_id,))
    if not students:
        return jsonify(error="Student not found"), 404

    offerings = query("""
        SELECT o.offering_id, o.acad_year, c.course_id, c.course_name, c.course_code, c.credits,
               fa.faculty_id, fa.faculty_name
        FROM Course_Offering o
        JOIN Course c ON c.course_id = o.course_id
        JOIN Faculty fa ON fa.faculty_id = o.faculty_id
        ORDER BY o.offering_id""")
    questions = query("SELECT * FROM Question WHERE question_id BETWEEN 1 AND 5 ORDER BY question_id")
    forms = query("SELECT * FROM Feedback_Form WHERE status = 'ACTIVE' ORDER BY form_id LIMIT 1")

    return jsonify(student=students[0], offerings=offerings, questions=questions,
                   form=forms[0] if forms else None)


# ---- Student: own feedback history ----
@app.get("/api/feedback")
def my_feedback():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify(error="student_id required"), 400
    rows = query(FEEDBACK_SQL + " WHERE f.student_id = %s ORDER BY f.feedback_id, r.question_id",
                 (student_id,))
    return jsonify(group_feedback(rows, False))


# ---- Student: submit feedback ----
@app.post("/api/feedback")
def submit_feedback():
    data = request.get_json(silent=True) or {}
    student_id = data.get("student_id")
    offering_id = data.get("offering_id")
    form_id = data.get("form_id")
    ratings = data.get("ratings")
    is_anonymous = 1 if data.get("is_anonymous") else 0
    comment = str(data.get("comment") or "").strip() or None

    if not (student_id and offering_id and form_id):
        return jsonify(error="Missing student, course or form"), 400

    valid = (
        isinstance(ratings, list) and len(ratings) > 0 and
        all(
            isinstance(r, dict)
            and isinstance(r.get("question_id"), int)
            and isinstance(r.get("rating"), int)
            and 1 <= r["rating"] <= 10
            for r in ratings
        )
    )
    if not valid:
        return jsonify(error="Ratings must be whole numbers from 1 to 10"), 400

    forms = query("SELECT status FROM Feedback_Form WHERE form_id = %s", (form_id,))
    if not forms or forms[0]["status"] != "ACTIVE":
        return jsonify(error="This feedback form is closed"), 400

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO Feedback (sub_date, is_anonymous, student_id, offering_id, form_id) "
                "VALUES (CURDATE(), %s, %s, %s, %s)",
                (is_anonymous, student_id, offering_id, form_id),
            )
            feedback_id = cur.lastrowid
            last = len(ratings) - 1
            cur.executemany(
                "INSERT INTO Response (rating, comment, feedback_id, question_id) VALUES (%s, %s, %s, %s)",
                [(r["rating"], comment if i == last else None, feedback_id, r["question_id"])
                 for i, r in enumerate(ratings)],
            )
        conn.commit()
        return jsonify(feedback_id=feedback_id), 201
    except pymysql.err.IntegrityError:
        conn.rollback()
        return jsonify(error="Invalid student, course or question"), 400
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---- Admin: all feedback (anonymous names hidden) ----
@app.get("/api/admin/feedback")
def admin_feedback():
    rows = query(FEEDBACK_SQL + " ORDER BY f.feedback_id, r.question_id")
    return jsonify(group_feedback(rows, True))


# ---- Serve the frontend files ----
@app.get("/<path:filename>")
def static_files(filename):
    if filename.split("/")[0] not in STATIC_FOLDERS:
        abort(404)
    return send_from_directory(BASE, filename)


@app.errorhandler(Exception)
def handle_error(e):
    if isinstance(e, HTTPException):
        return e
    app.logger.exception(e)
    return jsonify(error=f"Server error: {e}"), 500


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 3000)), debug=True)
