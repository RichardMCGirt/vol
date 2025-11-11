// auth.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("🛡️ Auth check running...");

  const user = localStorage.getItem("loggedInUser");
  console.log("👤 Logged in user:", user);

  if (!user) {
    console.warn("🚫 No user session found. Redirecting to login...");
    window.location.href = "login.html";
  }
});
