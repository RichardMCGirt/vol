import { logActivity } from "./activity-logger.js";


// nav.js (Improved)
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Navigation script loaded");

  // Map button IDs to their target pages
  const routes = {
    "nav-dashboard": "index.html",
    "nav-takeoffs": "Takeoff.html",
    "nav-builders": "builder.html",
    "nav-communities": "communities.html",
    "nav-sku-database": "sku-database.html",
    "nav-reports": "report.html",
    "nav-recent-activity": "recent-activity.html",
    "nav-vendors": "vendor.html",
    "nav-permission": "permission.html",
    "nav-color-group": "colorgroup.html",
    "nav-admin": "admin.html"
  };

  // Attach click events to all sidebar buttons dynamically
  Object.entries(routes).forEach(([id, page]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        console.log(`➡ Navigating to ${page}`);
        window.location.href = page;
      });
    }
  });

  // Logo navigation
  const logo = document.getElementById("nav-logo");
  if (logo) {
    logo.addEventListener("click", () => {
      const current = window.location.pathname.split("/").pop();
      if (current !== "index.html" && current !== "") {
        console.log("🏠 Returning to dashboard");
        window.location.href = "index.html";
      }
    });
  }

  // Dashboard Quick Actions
  const quickActions = [
    { selector: "#active-takeoffs-card", page: "takeoff.html" },
    { selector: "#builders-card", page: "builder.html" },
    { selector: "button.bg-green-50.text-green-700", page: "takeoff-creation.html" },
    { selector: "#add-builder-btn", page: "builder.html" }
  ];

  quickActions.forEach(({ selector, page }) => {
    const el = document.querySelector(selector);
    if (el) {
      el.addEventListener("click", () => {
        console.log(`🚀 Redirecting to ${page}`);
        window.location.href = page;
      });
    }
  });

  // Handle special modal trigger (prevent redirect)
  const addCommunityModalBtn = document.getElementById("open-community-modal");
  if (addCommunityModalBtn) {
    addCommunityModalBtn.addEventListener("click", (e) => {
      console.log("🪟 Opening community modal (no redirect)");
      e.stopPropagation();
    });
  }
  const createBtn = document.getElementById("create-takeoff-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        console.log("🚀 Redirecting to takeoff-creation.html");
        window.location.href = "takeoff-creation.html";
      });
    }
  
  // Highlight the current active page automatically
  const current = window.location.pathname.split("/").pop() || "index.html";
  Object.entries(routes).forEach(([id, page]) => {
    if (current === page) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.add("bg-accent", "font-semibold");
      }
    }
  });

  console.log(`✅ Active page: ${current}`);
});
document.addEventListener("DOMContentLoaded", () => {

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      console.log("🚪 Logging out…");

      // 🔥 NEW logger format (stores objects)
      await logActivity({
        type: "Logout",
        action: "Logout",
        details: "",
      });

      localStorage.clear();
      window.location.href = "login.html";
    });
  }

});
