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
