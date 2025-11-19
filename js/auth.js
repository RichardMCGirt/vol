// auth.js
document.addEventListener("DOMContentLoaded", () => {

  const currentPage = window.location.pathname.split("/").pop().toLowerCase();
  const loggedInUser = localStorage.getItem("loggedInUser");

  // Skip redirect logic on login page
  if (currentPage === "login.html") {
    return;
  }

  // Wait briefly before redirecting to prevent loop issues
  if (!loggedInUser) {
    console.warn("🚫 No session found. Redirecting to login...");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);
    return;
  }

  // Logout button handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      console.log("👋 Logging out user:", loggedInUser);
      localStorage.clear();
      window.location.href = "login.html";
    });
  }

});
