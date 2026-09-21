
// ===== CONFIG =====
const API = "http://localhost:3000/api";
const STUDENT_ID = 1001; // logged-in student (replace with real login later)
 
// ===== STATE (loaded from the database) =====
let studentProfile = {};
let courseOfferings = [];
let questionBank = [];
let activeForm = null;
let myFeedback = [];
let allFeedback = [];
let currentUser = "student"; // student or admin
 
const pages = document.querySelectorAll(".page");
const navItems = document.querySelectorAll(".nav-item");
const title = document.getElementById("pageTitle");
const courseSelect = document.getElementById("courseSelect");
const progressLabel = document.getElementById("progressLabel");
const progressBar = document.getElementById("progressBar");
 
const titles = {
  dashboard: "Dashboard",
  feedback: "Give Feedback",
  history: "My Feedback",
  courses: "My Courses",
  profile: "Profile",
  "admin-dashboard": "Feedback Overview",
  "admin-feedback": "All Feedback",
  "admin-courses": "Courses",
  "admin-faculty": "Faculty Performance",
  "admin-analytics": "Analytics & Trends"
};
 
// ===== HELPERS =====
async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
 
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
 
function fmtDate(str) {
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
 
function toast(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
 
// ===== PAGE NAVIGATION =====
function showPage(id) {
  pages.forEach(p => p.classList.toggle("active", p.id === id));
  navItems.forEach(n => n.classList.toggle("active", n.dataset.page === id));
  title.textContent = titles[id] || "Dashboard";
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
 
navItems.forEach(n => n.addEventListener("click", () => showPage(n.dataset.page)));
 
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.course) {
    const match = courseOfferings.find(o => `${o.course_name} — ${o.course_code}` === b.dataset.course);
    if (match) courseSelect.value = match.offering_id;
  }
  showPage(b.dataset.go);
}));
 
document.getElementById("menuBtn").addEventListener("click", () =>
  document.getElementById("sidebar").classList.toggle("open")
);
 
// ===== RATING BUTTONS =====
document.querySelectorAll(".rating-group").forEach(group => {
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.type = "button";
    btn.addEventListener("click", () => {
      group.querySelectorAll("button").forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
      updateProgress();
    });
    group.appendChild(btn);
  }
});
 
function updateProgress() {
  const answered = document.querySelectorAll(".rating-group .selected").length;
  progressLabel.textContent = `${answered} of 5 answered`;
  progressBar.style.width = `${answered * 20}%`;
}
 
// ===== LOAD DATA FROM DATABASE =====
async function init() {
  try {
    const data = await api(`/init/${STUDENT_ID}`);
    studentProfile = data.student;
    courseOfferings = data.offerings;
    questionBank = data.questions;
    activeForm = data.form;
 
    renderCourseOptions();
    renderProfile();
    populateAdminCourseFilter();
    await loadMyFeedback();
  } catch (err) {
    toast("Cannot reach server: " + err.message);
  }
}
 
function renderCourseOptions() {
  courseSelect.innerHTML = courseOfferings
    .map(o => `<option value="${o.offering_id}">${esc(o.course_name)} — ${esc(o.course_code)}</option>`)
    .join("");
}
 
function populateAdminCourseFilter() {
  const filter = document.getElementById("adminCourseFilter");
  filter.innerHTML = `<option value="">All courses</option>` +
    courseOfferings.map(o => `<option value="${esc(o.course_name)}">${esc(o.course_name)}</option>`).join("");
}
 
function renderProfile() {
  document.getElementById("userNameDisplay").textContent = studentProfile.name;
  document.getElementById("userRoleDisplay").textContent = `${studentProfile.department} • S${studentProfile.semester}`;
 
  const header = document.querySelector("#profile .profile-header");
  header.querySelector("h2").textContent = studentProfile.name;
  header.querySelector("p").textContent = `Student ID: ${studentProfile.student_id} • ${studentProfile.department}`;
 
  const fields = document.querySelectorAll("#profile .profile-fields strong");
  fields[0].textContent = studentProfile.student_id;
  fields[1].textContent = studentProfile.name;
  fields[2].textContent = studentProfile.email;
  fields[3].textContent = `${studentProfile.semester}${["th", "st", "nd", "rd"][studentProfile.semester] || "th"} Semester`;
}
 
// ===== STUDENT HISTORY / DASHBOARD =====
async function loadMyFeedback() {
  myFeedback = await api(`/feedback?student_id=${STUDENT_ID}`);
  renderStudentHistory();
}
 
function renderStudentHistory() {
  const recent = [...myFeedback].reverse(); // newest first
 
  document.getElementById("feedbackCount").textContent = recent.length;
 
  // History table
  const tbody = document.getElementById("historyBody");
  tbody.innerHTML = recent.length
    ? recent.map(f => `<tr><td>${esc(f.course)}</td><td>${esc(f.faculty)}</td><td>${fmtDate(f.date)}</td><td><b>${f.rating}/10</b></td><td><span class="badge green">Submitted</span></td></tr>`).join("")
    : `<tr id="historyEmpty"><td colspan="5" class="empty-history">No feedback submitted yet. Your responses will appear here.</td></tr>`;
 
  // Recent activity on dashboard
  const panel = document.querySelector("#dashboard .grid-2 .panel:nth-child(2)");
  panel.querySelectorAll(".activity").forEach(a => a.remove());
  document.getElementById("recentEmpty").style.display = recent.length ? "none" : "";
  recent.slice(0, 5).forEach(f => {
    const activity = document.createElement("div");
    activity.className = "activity";
    activity.innerHTML = `<span class="dot"></span><div><strong>${esc(f.course)}</strong><p>${fmtDate(f.date)}</p></div><span class="rating">${f.rating}/10</span>`;
    panel.appendChild(activity);
  });
}
 
// ===== STUDENT FEEDBACK SUBMISSION =====
document.getElementById("submitFeedback").addEventListener("click", async () => {
  const groups = [...document.querySelectorAll(".rating-group")];
  if (groups.some(g => !g.querySelector(".selected"))) {
    toast("Please rate all five questions.");
    return;
  }
  if (!activeForm) {
    toast("No active feedback form.");
    return;
  }
 
  const btn = document.getElementById("submitFeedback");
  btn.disabled = true;
 
  try {
    await api("/feedback", {
      method: "POST",
      body: JSON.stringify({
        student_id: STUDENT_ID,
        offering_id: Number(courseSelect.value),
        form_id: activeForm.form_id,
        is_anonymous: document.getElementById("anonymous").checked,
        comment: document.getElementById("comment").value,
        ratings: groups.map((g, i) => ({
          question_id: questionBank[i].question_id,
          rating: Number(g.querySelector(".selected").textContent)
        }))
      })
    });
 
    // Reset form
    document.querySelectorAll(".rating-group button").forEach(x => x.classList.remove("selected"));
    updateProgress();
    document.getElementById("comment").value = "";
    document.getElementById("anonymous").checked = false;
 
    await loadMyFeedback();
    toast("Feedback submitted successfully ✓");
    setTimeout(() => showPage("history"), 700);
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
});
 
document.getElementById("logoutBtn").addEventListener("click", () => {
  toast("Demo logout — connect this to your backend later.");
});
 
// ===== ACCOUNT SWITCHING =====
document.getElementById("switchAccountBtn").addEventListener("click", () => {
  document.getElementById("switchModal").classList.add("active");
});
 
document.querySelectorAll(".account-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    switchAccount(btn.dataset.account);
    document.getElementById("switchModal").classList.remove("active");
  });
});
 
document.getElementById("switchModal").addEventListener("click", (e) => {
  if (e.target.id === "switchModal") {
    document.getElementById("switchModal").classList.remove("active");
  }
});
 
async function loadAdminData() {
  allFeedback = await api("/admin/feedback");
  updateAdminDashboard();
  updateAdminFeedbackTable();
}
 
async function switchAccount(account) {
  currentUser = account;
 
  if (account === "student") {
    document.getElementById("studentNav").classList.remove("hidden");
    document.getElementById("adminNav").classList.add("hidden");
    document.getElementById("brandSubtitle").textContent = "Student Feedback System";
    document.getElementById("pageEyebrow").textContent = "ACADEMIC PORTAL";
    document.getElementById("avatarDisplay").textContent = "AS";
    document.getElementById("userNameDisplay").textContent = studentProfile.name;
    document.getElementById("userRoleDisplay").textContent = `${studentProfile.department} • S${studentProfile.semester}`;
    document.getElementById("topAvatar").textContent = "AS";
    document.getElementById("switchAccountBtn").textContent = "🔄 Switch Account";
 
    showPage("dashboard");
    toast("Switched to Student Account");
  } else {
    document.getElementById("studentNav").classList.add("hidden");
    document.getElementById("adminNav").classList.remove("hidden");
    document.getElementById("brandSubtitle").textContent = "Admin Dashboard";
    document.getElementById("pageEyebrow").textContent = "ADMINISTRATION";
    document.getElementById("avatarDisplay").textContent = "AD";
    document.getElementById("userNameDisplay").textContent = "Administrator";
    document.getElementById("userRoleDisplay").textContent = "System Admin";
    document.getElementById("topAvatar").textContent = "AD";
    document.getElementById("switchAccountBtn").textContent = "🔄 Student";
 
    try {
      await loadAdminData();
    } catch (err) {
      toast("Could not load feedback: " + err.message);
    }
    showPage("admin-dashboard");
    toast("Switched to Admin Account");
  }
}
 
// ===== ADMIN DASHBOARD =====
function updateAdminDashboard() {
  const totalFeedback = allFeedback.length;
  const avgRating = totalFeedback > 0
    ? (allFeedback.reduce((sum, f) => sum + parseFloat(f.rating), 0) / totalFeedback).toFixed(1)
    : "—";
 
  const uniqueCourses = new Set(allFeedback.map(f => f.course)).size;
 
  document.getElementById("totalFeedback").textContent = totalFeedback;
  document.getElementById("avgRating").textContent = avgRating;
  document.getElementById("coursesRated").textContent = uniqueCourses;
 
  const courseRatings = {};
  allFeedback.forEach(f => {
    if (!courseRatings[f.course]) courseRatings[f.course] = [];
    courseRatings[f.course].push(parseFloat(f.rating));
  });
 
  const topCourses = Object.entries(courseRatings)
    .map(([name, ratings]) => ({
      name,
      avg: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
      count: ratings.length
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);
 
  document.getElementById("topCourses").innerHTML = topCourses.length > 0
    ? topCourses.map(c => `<div class="feedback-item"><strong>${esc(c.name)}</strong><span>${c.avg}/10</span><small>${c.count} responses</small></div>`).join("")
    : "<p style='color:#999;'>No feedback yet</p>";
 
  const recentFeedback = [...allFeedback].reverse().slice(0, 5);
  document.getElementById("recentSubmissions").innerHTML = recentFeedback.length > 0
    ? recentFeedback.map(f => `<div class="feedback-item"><strong>${esc(f.course)}</strong><span>${f.rating}/10</span><small>${fmtDate(f.date)}</small></div>`).join("")
    : "<p style='color:#999;'>No feedback yet</p>";
 
  updateCourseMetrics();
}
 
// ===== ADMIN FEEDBACK TABLE =====
const ratingRanges = { "8": [8, 10], "6": [6, 7.99], "4": [4, 5.99], "1": [0, 3.99] };
 
function updateAdminFeedbackTable() {
  const courseFilter = document.getElementById("adminCourseFilter")?.value || "";
  const ratingFilter = document.getElementById("adminRatingFilter")?.value || "";
 
  let filtered = allFeedback;
 
  if (courseFilter) {
    filtered = filtered.filter(f => f.course === courseFilter);
  }
 
  if (ratingFilter) {
    const [min, max] = ratingRanges[ratingFilter];
    filtered = filtered.filter(f => parseFloat(f.rating) >= min && parseFloat(f.rating) <= max);
  }
 
  const tbody = document.getElementById("adminFeedbackBody");
  if (filtered.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6' class='empty-history'>No feedback found</td></tr>";
    return;
  }
 
  tbody.innerHTML = [...filtered].reverse()
    .map(f => `
      <tr>
        <td>${esc(f.course)}</td>
        <td>${esc(f.faculty)}</td>
        <td>${esc(f.student)}</td>
        <td>${fmtDate(f.date)}</td>
        <td><b>${f.rating}/10</b></td>
        <td><button class="text-btn" onclick="viewFeedbackDetail(${f.feedback_id})">View</button></td>
      </tr>
    `)
    .join("");
}
 
// ===== UPDATE COURSE METRICS =====
function updateCourseMetrics() {
  const courses = ["CS301", "CS302", "CS303", "MA301", "HU301"];
  courses.forEach(code => {
    const courseFeedback = allFeedback.filter(f => f.courseCode === code);
    const count = courseFeedback.length;
    const avg = count > 0
      ? (courseFeedback.reduce((sum, f) => sum + parseFloat(f.rating), 0) / count).toFixed(1)
      : "—";
 
    document.getElementById(`feedback${code}`).textContent = count;
    document.getElementById(`rating${code}`).textContent = avg;
  });
 
  const facultyCards = courseOfferings
    .map(o => {
      const feedback = allFeedback.filter(fb => fb.offering_id === o.offering_id);
      const avg = feedback.length > 0
        ? (feedback.reduce((sum, fb) => sum + parseFloat(fb.rating), 0) / feedback.length).toFixed(1)
        : "—";
      return `
        <div class="course-card">
          <h3>${esc(o.faculty_name)}</h3>
          <p>${esc(o.course_code)}</p>
          <div style="font-size:24px;font-weight:bold;margin:10px 0;">${avg}/10</div>
          <small>${feedback.length} ratings</small>
        </div>
      `;
    })
    .join("");
 
  document.getElementById("facultyCards").innerHTML = facultyCards;
}
 
// ===== VIEW FEEDBACK DETAIL =====
function viewFeedbackDetail(id) {
  const feedback = allFeedback.find(f => f.feedback_id === id);
  if (!feedback) return;
 
  const ratingsHtml = questionBank
    .map((q, i) => `<div><strong>${esc(q.q_text)}</strong><span>${feedback.ratings[i]}/10</span></div>`)
    .join("");
 
  document.getElementById("feedbackModalBody").innerHTML = `
    <div style="margin-bottom:20px;">
      <p><strong>Course:</strong> ${esc(feedback.course)}</p>
      <p><strong>Student:</strong> ${esc(feedback.student)}</p>
      <p><strong>Date:</strong> ${fmtDate(feedback.date)}</p>
      <p><strong>Average Rating:</strong> <b>${feedback.rating}/10</b></p>
    </div>
    <div style="margin-bottom:20px;">
      <h4>Individual Ratings</h4>
      ${ratingsHtml}
    </div>
    ${feedback.comment ? `<div><h4>Comments</h4><p>${esc(feedback.comment)}</p></div>` : ""}
  `;
 
  document.getElementById("feedbackModal").classList.add("active");
}
 
document.getElementById("closeFeedbackModal")?.addEventListener("click", () => {
  document.getElementById("feedbackModal").classList.remove("active");
});
 
document.getElementById("adminCourseFilter")?.addEventListener("change", updateAdminFeedbackTable);
document.getElementById("adminRatingFilter")?.addEventListener("change", updateAdminFeedbackTable);
 
// ===== ANALYTICS =====
function updateAnalytics() {
  if (allFeedback.length === 0) {
    document.getElementById("ratingChart").innerHTML = "<p style='color:#999;'>No data yet</p>";
    document.getElementById("questionChart").innerHTML = "<p style='color:#999;'>No data yet</p>";
    document.getElementById("themesContainer").innerHTML = "<p style='color:#999;'>No comments yet</p>";
    return;
  }
 
  const ratingBuckets = { "9-10": 0, "7-8": 0, "5-6": 0, "3-4": 0, "1-2": 0 };
  allFeedback.forEach(f => {
    const r = parseFloat(f.rating);
    if (r >= 9) ratingBuckets["9-10"]++;
    else if (r >= 7) ratingBuckets["7-8"]++;
    else if (r >= 5) ratingBuckets["5-6"]++;
    else if (r >= 3) ratingBuckets["3-4"]++;
    else ratingBuckets["1-2"]++;
  });
 
  document.getElementById("ratingChart").innerHTML = Object.entries(ratingBuckets)
    .map(([range, count]) => `
      <div style="margin-bottom:10px;">
        <strong>${range}</strong>
        <div style="background:#ddd;height:20px;border-radius:4px;width:100%;overflow:hidden;">
          <div style="background:#123f45;height:100%;width:${Math.max((count / allFeedback.length) * 100, 5)}%;"></div>
        </div>
        <small>${count}</small>
      </div>
    `)
    .join("");
 
  const questionTitles = ["Clarity", "Methods", "Interaction", "Materials", "Overall"];
  const questionAvgs = [0, 1, 2, 3, 4].map(i =>
    (allFeedback.reduce((sum, f) => sum + f.ratings[i], 0) / allFeedback.length).toFixed(1)
  );
 
  document.getElementById("questionChart").innerHTML = questionTitles
    .map((q, i) => `
      <div style="margin-bottom:10px;">
        <strong>${q}</strong>
        <div style="background:#ddd;height:20px;border-radius:4px;width:100%;overflow:hidden;">
          <div style="background:#e97762;height:100%;width:${(questionAvgs[i] / 10) * 100}%;"></div>
        </div>
        <small>${questionAvgs[i]}/10</small>
      </div>
    `)
    .join("");
 
  const comments = allFeedback.filter(f => f.comment).map(f => f.comment);
  document.getElementById("themesContainer").innerHTML = comments.length > 0
    ? comments.map(c => `<div style="padding:10px;background:#f5f5f5;margin-bottom:10px;border-radius:4px;"><p>${esc(c)}</p></div>`).join("")
    : "<p style='color:#999;'>No comments available</p>";
}
 
const originalShowPage = showPage;
showPage = function (id) {
  originalShowPage(id);
  if (id === "admin-analytics") updateAnalytics();
};
 
// ===== START =====
init();
