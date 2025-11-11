// nav.js
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar buttons
  const dashboardBtn = document.getElementById("nav-dashboard");
  const takeoffsBtn = document.getElementById("nav-takeoffs");
  const buildersBtn = document.getElementById("nav-builders");
  const communitiesBtn = document.getElementById("nav-communities");
  const logo = document.getElementById("nav-logo");

  // Dashboard cards
  const activeTakeoffsCard = document.getElementById("active-takeoffs-card");
  const buildersCard = document.getElementById("builders-card");
  const createTakeoffBtn = document.querySelector('button.bg-green-50.text-green-700');

  // Page-specific
  const addBuilderBtn = document.getElementById("add-builder-btn");
  const addCommunityBtn = document.getElementById("add-community-btn");

  // Navigation handlers
  if (dashboardBtn) dashboardBtn.addEventListener("click", () => (window.location.href = "index.html"));
  if (takeoffsBtn) takeoffsBtn.addEventListener("click", () => (window.location.href = "takeoff.html"));
  if (buildersBtn) buildersBtn.addEventListener("click", () => (window.location.href = "builder.html"));
  if (communitiesBtn) communitiesBtn.addEventListener("click", () => (window.location.href = "communities.html"));

  if (logo) {
    logo.addEventListener("click", () => {
      const current = window.location.pathname.split("/").pop();
      if (current !== "index.html" && current !== "") window.location.href = "index.html";
    });
  }

  // Dashboard interactivity
  if (activeTakeoffsCard) activeTakeoffsCard.addEventListener("click", () => (window.location.href = "takeoff.html"));
  if (buildersCard) buildersCard.addEventListener("click", () => (window.location.href = "builder.html"));
  if (createTakeoffBtn) createTakeoffBtn.addEventListener("click", () => (window.location.href = "takeoff.html"));
  if (addBuilderBtn) addBuilderBtn.addEventListener("click", () => (window.location.href = "builder-add.html"));
  if (addCommunityBtn) addCommunityBtn.addEventListener("click", () => (window.location.href = "community-add.html"));

  // Highlight current active page
  const current = window.location.pathname.split("/").pop();
  if (current === "index.html" || current === "") {
    dashboardBtn?.classList.add("bg-gray-100", "font-semibold");
  } else if (current === "takeoff.html") {
    takeoffsBtn?.classList.add("bg-gray-100", "font-semibold");
  } else if (current === "builder.html") {
    buildersBtn?.classList.add("bg-gray-100", "font-semibold");
  } else if (current === "communities.html") {
    communitiesBtn?.classList.add("bg-gray-100", "font-semibold");
  }
});
