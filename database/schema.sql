CREATE DATABASE IF NOT EXISTS feedback;
USE feedback;

CREATE TABLE Student (
    student_id INT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100),
    semester INT
);

CREATE TABLE Faculty (
    faculty_id INT PRIMARY KEY,
    faculty_name VARCHAR(50),
    dept VARCHAR(50)
);

CREATE TABLE Course (
    course_id INT PRIMARY KEY,
    credits INT,
    course_name VARCHAR(100)
);

CREATE TABLE Course_Offering (
    offering_id INT PRIMARY KEY,
    acad_year VARCHAR(20),
    faculty_id INT,
    course_id INT,
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

CREATE TABLE Feedback_Form (
    form_id INT PRIMARY KEY,
    title VARCHAR(100),
    status VARCHAR(20)
);

CREATE TABLE Feedback (
    feedback_id INT PRIMARY KEY,
    sub_date DATE,
    is_anonymous BOOLEAN,
    student_id INT,
    offering_id INT,
    form_id INT,
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (offering_id) REFERENCES Course_Offering(offering_id),
    FOREIGN KEY (form_id) REFERENCES Feedback_Form(form_id)
);

CREATE TABLE Question (
    question_id INT PRIMARY KEY,
    q_text VARCHAR(255),
    q_type VARCHAR(50)
);

CREATE TABLE Response (
    response_id INT PRIMARY KEY,
    rating INT,
    comment VARCHAR(255),
    feedback_id INT,
    question_id INT,
    FOREIGN KEY (feedback_id) REFERENCES Feedback(feedback_id),
    FOREIGN KEY (question_id) REFERENCES Question(question_id)
);



-- Run AFTER your existing schema
USE feedback;

-- Columns the frontend needs
ALTER TABLE Course ADD COLUMN course_code VARCHAR(10);
ALTER TABLE Student ADD COLUMN department VARCHAR(100);

-- Auto-generated IDs for new submissions
ALTER TABLE Feedback MODIFY feedback_id INT AUTO_INCREMENT;
ALTER TABLE Response MODIFY response_id INT AUTO_INCREMENT;

-- Allow longer comments
ALTER TABLE Response MODIFY comment TEXT;

-- ===== Seed data (matches the frontend) =====
INSERT IGNORE INTO Student (student_id, name, email, semester, department) VALUES
(1001, 'Alex Student', 'alex.student@college.edu', 3, 'Computer Science & Business Systems');

INSERT IGNORE INTO Faculty (faculty_id, faculty_name, dept) VALUES
(1, 'Dr. Meera Nair', 'CSE'),
(2, 'Prof. Rahul Mathew', 'CSE'),
(3, 'Dr. Anil Kumar', 'CSE'),
(4, 'Dr. Suresh P.', 'Mathematics'),
(5, 'Ms. Anjali Joseph', 'Humanities');

INSERT IGNORE INTO Course (course_id, credits, course_name, course_code) VALUES
(1, 4, 'Database Management Systems', 'CS301'),
(2, 4, 'Computer Organization', 'CS302'),
(3, 4, 'Data Structures', 'CS303'),
(4, 3, 'Discrete Mathematics', 'MA301'),
(5, 3, 'Business Communication', 'HU301');

INSERT IGNORE INTO Course_Offering (offering_id, acad_year, faculty_id, course_id) VALUES
(101, '2025-2026', 1, 1),
(102, '2025-2026', 2, 2),
(103, '2025-2026', 3, 3),
(104, '2025-2026', 4, 4),
(105, '2025-2026', 5, 5);

INSERT IGNORE INTO Feedback_Form (form_id, title, status) VALUES
(1, 'Semester Feedback Form', 'ACTIVE'),
(2, 'Mid Semester Feedback', 'CLOSED');

INSERT IGNORE INTO Question (question_id, q_text, q_type) VALUES
(1, 'How clearly does the faculty explain concepts?', 'rating'),
(2, 'How effective are the teaching methods?', 'rating'),
(3, 'How well does the faculty interact with students?', 'rating'),
(4, 'How useful are the course materials?', 'rating'),
(5, 'Overall, how satisfied are you with this course?', 'rating');
