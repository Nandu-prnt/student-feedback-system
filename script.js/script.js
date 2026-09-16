// ===== STATE MANAGEMENT =====
let currentUser = "student"; // student or admin
let allFeedback = [];

const pages = document.querySelectorAll(".page");
const navItems = document.querySelectorAll(".nav-item");
const title = document.getElementById("pageTitle");

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

const courseSelect = document.getElementById("courseSelect");
const progressLabel = document.getElementById("progressLabel");
const progressBar = document.getElementById("progressBar");

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
  if (b.dataset.course) courseSelect.value = b.dataset.course;
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

// ===== TOAST NOTIFICATIONS =====
function toast(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

// ===== STUDENT FEEDBACK SUBMISSION =====
document.getElementById("submitFeedback").addEventListener("click", () => {
  const groups = [...document.querySelectorAll(".rating-group")];
  if (groups.some(g => !g.querySelector(".selected"))) {
    toast("Please rate all five questions.");
    return;
  }

  const course = document.getElementById("courseSelect").value;
  const courseName = course.split(" — ")[0];
  const ratings = groups.map(g => Number(g.querySelector(".selected").textContent));
  const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  const isAnonymous = document.getElementById("anonymous").checked;
  const comment = document.getElementById("comment").value;

  // Create feedback object and store
  const feedback = {
    id: Date.now(),
    course: courseName,
    courseCode: course.includes("CS301") ? "CS301" : course.includes("CS302") ? "CS302" : course.includes("CS303") ? "CS303" : course.includes("MA301") ? "MA301" : "HU301",
    faculty: "Faculty",
    student: isAnonymous ? "Anonymous" : "Alex Student",
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    rating: avg,
    ratings: ratings,
    comment: comment,
    anonymous: isAnonymous
  };

  allFeedback.push(feedback);

  // Update student history
  const row = document.createElement("tr");
  row.innerHTML = `<td>${courseName}</td><td>Faculty</td><td>${feedback.date}</td><td><b>${avg}/10</b></td><td><span class="badge green">Submitted</span></td>`;
  document.getElementById("historyEmpty")?.remove();
  document.getElementById("historyBody").prepend(row);

  // Update recent activity
  document.getElementById("recentEmpty")?.remove();
  const activity = document.createElement("div");
  activity.className = "activity";
  activity.innerHTML = `<span class="dot"></span><div><strong>${courseName}</strong><p>Submitted just now</p></div><span class="rating">${avg}/10</span>`;
  document.querySelector("#dashboard .panel:nth-child(2)").appendChild(activity);

  // Update counter
  const count = document.getElementById("feedbackCount");
  count.textContent = Number(count.textContent) + 1;

  // Reset form
  document.querySelectorAll(".rating-group button").forEach(x => x.classList.remove("selected"));
  updateProgress();
  document.getElementById("comment").value = "";
  document.getElementById("anonymous").checked = false;

  // Redirect and notify
  toast("Feedback submitted successfully ✓");
  setTimeout(() => showPage("history"), 700);
  
  // Update admin views
  updateAdminDashboard();
  updateAdminFeedbackTable();
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
    const account = btn.dataset.account;
    switchAccount(account);
    document.getElementById("switchModal").classList.remove("active");
  });
});

// Close modal when clicking outside
document.getElementById("switchModal").addEventListener("click", (e) => {
  if (e.target.id === "switchModal") {
    document.getElementById("switchModal").classList.remove("active");
  }
});

function switchAccount(account) {
  currentUser = account;

  if (account === "student") {
    // Show student UI
    document.getElementById("studentNav").classList.remove("hidden");
    document.getElementById("adminNav").classList.add("hidden");
    document.getElementById("brandSubtitle").textContent = "Student Feedback System";
    document.getElementById("pageEyebrow").textContent = "ACADEMIC PORTAL";
    document.getElementById("avatarDisplay").textContent = "AS";
    document.getElementById("userNameDisplay").textContent = "Alex Student";
    document.getElementById("userRoleDisplay").textContent = "CSBS • S3";
    document.getElementById("topAvatar").textContent = "AS";
    document.getElementById("switchAccountBtn").textContent = "🔄 Switch Account";
    
    showPage("dashboard");
    toast("Switched to Student Account");
  } else {
    // Show admin UI
    document.getElementById("studentNav").classList.add("hidden");
    document.getElementById("adminNav").classList.remove("hidden");
    document.getElementById("brandSubtitle").textContent = "Admin Dashboard";
    document.getElementById("pageEyebrow").textContent = "ADMINISTRATION";
    document.getElementById("avatarDisplay").textContent = "AD";
    document.getElementById("userNameDisplay").textContent = "Administrator";
    document.getElementById("userRoleDisplay").textContent = "System Admin";
    document.getElementById("topAvatar").textContent = "AD";
    document.getElementById("switchAccountBtn").textContent = "🔄 Student";
    
    updateAdminDashboard();
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

  // Top rated courses
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

  const topCoursesHtml = topCourses.length > 0
    ? topCourses.map(c => `<div class="feedback-item"><strong>${c.name}</strong><span>${c.avg}/10</span><small>${c.count} responses</small></div>`).join("")
    : "<p style='color:#999;'>No feedback yet</p>";
  document.getElementById("topCourses").innerHTML = topCoursesHtml;

  // Recent submissions
  const recentFeedback = [...allFeedback].reverse().slice(0, 5);
  const recentHtml = recentFeedback.length > 0
    ? recentFeedback.map(f => `<div class="feedback-item"><strong>${f.course}</strong><span>${f.rating}/10</span><small>${f.date}</small></div>`).join("")
    : "<p style='color:#999;'>No feedback yet</p>";
  document.getElementById("recentSubmissions").innerHTML = recentHtml;

  updateCourseMetrics();
}

// ===== ADMIN FEEDBACK TABLE =====
function updateAdminFeedbackTable() {
  const courseFilter = document.getElementById("adminCourseFilter")?.value || "";
  const ratingFilter = document.getElementById("adminRatingFilter")?.value || "";

  let filtered = allFeedback;

  if (courseFilter) {
    filtered = filtered.filter(f => f.course === courseFilter);
  }

  if (ratingFilter) {
    const threshold = parseInt(ratingFilter);
    filtered = filtered.filter(f => parseFloat(f.rating) >= threshold);
  }

  const tbody = document.getElementById("adminFeedbackBody");
  if (filtered.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6' class='empty-history'>No feedback found</td></tr>";
    return;
  }

  tbody.innerHTML = filtered
    .map(f => `
      <tr>
        <td>${f.course}</td>
        <td>${f.faculty}</td>
        <td>${f.student}</td>
        <td>${f.date}</td>
        <td><b>${f.rating}/10</b></td>
        <td><button class="text-btn" onclick="viewFeedbackDetail(${f.id})">View</button></td>
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

  // Faculty cards
  const facultyData = [
    { name: "Dr. Meera Nair", code: "CS301" },
    { name: "Prof. Rahul Mathew", code: "CS302" },
    { name: "Dr. Anil Kumar", code: "CS303" },
    { name: "Dr. Suresh P.", code: "MA301" },
    { name: "Ms. Anjali Joseph", code: "HU301" }
  ];

  const facultyCards = facultyData
    .map(f => {
      const feedback = allFeedback.filter(fb => fb.courseCode === f.code);
      const avg = feedback.length > 0
        ? (feedback.reduce((sum, fb) => sum + parseFloat(fb.rating), 0) / feedback.length).toFixed(1)
        : "—";
      return `
        <div class="course-card">
          <h3>${f.name}</h3>
          <p>${f.code}</p>
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
  const feedback = allFeedback.find(f => f.id === id);
  if (!feedback) return;

  const modalBody = document.getElementById("feedbackModalBody");
  const questions = [
    "How clearly does the faculty explain concepts?",
    "How effective are the teaching methods?",
    "How well does the faculty interact with students?",
    "How useful are the course materials?",
    "Overall, how satisfied are you with this course?"
  ];

  const ratingsHtml = questions
    .map((q, i) => `<div><strong>${q}</strong><span>${feedback.ratings[i]}/10</span></div>`)
    .join("");

  modalBody.innerHTML = `
    <div style="margin-bottom:20px;">
      <p><strong>Course:</strong> ${feedback.course}</p>
      <p><strong>Student:</strong> ${feedback.student}</p>
      <p><strong>Date:</strong> ${feedback.date}</p>
      <p><strong>Average Rating:</strong> <b>${feedback.rating}/10</b></p>
    </div>
    <div style="margin-bottom:20px;">
      <h4>Individual Ratings</h4>
      ${ratingsHtml}
    </div>
    ${feedback.comment ? `<div><h4>Comments</h4><p>${feedback.comment}</p></div>` : ""}
  `;

  document.getElementById("feedbackModal").classList.add("active");
}

// Close feedback modal
document.getElementById("closeFeedbackModal")?.addEventListener("click", () => {
  document.getElementById("feedbackModal").classList.remove("active");
});

// Filter listeners
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

  // Rating distribution
  const ratingBuckets = { "9-10": 0, "7-8": 0, "5-6": 0, "3-4": 0, "1-2": 0 };
  allFeedback.forEach(f => {
    const r = parseFloat(f.rating);
    if (r >= 9) ratingBuckets["9-10"]++;
    else if (r >= 7) ratingBuckets["7-8"]++;
    else if (r >= 5) ratingBuckets["5-6"]++;
    else if (r >= 3) ratingBuckets["3-4"]++;
    else ratingBuckets["1-2"]++;
  });

  const ratingChartHtml = Object.entries(ratingBuckets)
    .map(([range, count]) => `
      <div style="margin-bottom:10px;">
        <strong>${range}</strong>
        <div style="background:#ddd;height:20px;border-radius:4px;width:100%;overflow:hidden;">
          <div style="background:#123f45;height:100%;width:${Math.max((count/allFeedback.length)*100, 5)}%;"></div>
        </div>
        <small>${count}</small>
      </div>
    `)
    .join("");
  document.getElementById("ratingChart").innerHTML = ratingChartHtml;

  // Question ratings
  const questionTitles = ["Clarity", "Methods", "Interaction", "Materials", "Overall"];
  const questionAvgs = [0, 1, 2, 3, 4].map(i =>
    (allFeedback.reduce((sum, f) => sum + f.ratings[i], 0) / allFeedback.length).toFixed(1)
  );

  const questionChartHtml = questionTitles
    .map((q, i) => `
      <div style="margin-bottom:10px;">
        <strong>${q}</strong>
        <div style="background:#ddd;height:20px;border-radius:4px;width:100%;overflow:hidden;">
          <div style="background:#e97762;height:100%;width:${(questionAvgs[i]/10)*100}%;"></div>
        </div>
        <small>${questionAvgs[i]}/10</small>
      </div>
    `)
    .join("");
  document.getElementById("questionChart").innerHTML = questionChartHtml;

  // Comments
  const comments = allFeedback.filter(f => f.comment).map(f => f.comment);
  const themesHtml = comments.length > 0
    ? comments.map(c => `<div style="padding:10px;background:#f5f5f5;margin-bottom:10px;border-radius:4px;"><p>${c}</p></div>`).join("")
    : "<p style='color:#999;'>No comments available</p>";
  document.getElementById("themesContainer").innerHTML = themesHtml;
}

// Update analytics when switching to admin
const originalShowPage = showPage;
showPage = function(id) {
  originalShowPage(id);
  if (id === "admin-analytics") {
    updateAnalytics();
  }
};
