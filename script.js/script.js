const API = (() => {
  if (typeof window !== "undefined" && window.__API_URL__) {
    return window.__API_URL__;
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3000/api";
  }

  return "/api";
})();

const STUDENT_ID = 1001; // logged-in student (replace with real login later)
