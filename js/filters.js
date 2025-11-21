// =====================================================
// 🔥 UNIVERSAL FILTER ENGINE FOR GROUPED TAKEOFF VIEW
// Supports:
//  ✓ Search (takeoff name, elevation, builder)
//  ✓ Status (Draft/Complete)
//  ✓ Builder filter
//  ✓ Branch filter
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Grouped filter system initialized");

  const statusFilter = document.getElementById("status-filter");
  const builderFilter = document.getElementById("builder-filter");
  const branchFilter = document.getElementById("branch-filter");
  const searchFilter = document.getElementById("search-filter");

function applyAllFilters() {
    const search = (searchFilter?.value || "").toLowerCase().trim();
    const status = statusFilter?.value || "";
    const builder = builderFilter?.value || "";
    const branch = branchFilter?.value || "";

    console.log("🔎 APPLY FILTERS");
    console.log("   ➤ search =", search);
    console.log("   ➤ status =", status);
    console.log("   ➤ builder =", builder);
    console.log("   ➤ branch =", branch);

    // Auto-expand if searching
    if (search) {
        console.log("📂 Auto-expanding all containers because search is active");

        document.querySelectorAll(".takeoff-container").forEach(c => {
            c.classList.remove("hidden");
        });

        document.querySelectorAll(".elevation-container").forEach(c => {
            c.classList.remove("hidden");
        });

        document.querySelectorAll(".revision-container").forEach(c => {
            c.classList.remove("hidden");
        });
    }

    console.log("📄 Checking takeoff-blocks...");

// SEARCH ONLY BY TAKEOFF NAME
document.querySelectorAll(".takeoff-block").forEach(takeoff => {

    // Always target the H3 ONLY
    const nameEl = takeoff.querySelector(".toggle-takeoff");

    const takeoffName = nameEl
        ? nameEl.textContent.trim().toLowerCase()
        : "";

    let show = true;

    console.log("   ▶ TAKEOFF:", JSON.stringify(takeoffName));

    // SEARCH MATCH (strict)
    if (search) {
        show = takeoffName.includes(search);
        console.log("     🔍 matches search?", show);
    }

    // Apply visibility
    takeoff.style.display = show ? "" : "none";
    console.log(show ? "     ✅ Showing" : "     ❌ Hiding", takeoffName);
});



    console.log("📉 Collapsing empty groups...");
    collapseEmptyGroups();

    console.log("✔ FILTERING COMPLETE");
}
window.applyAllFilters = applyAllFilters;

document.querySelectorAll(".division-block").forEach(div => {
    const visibleTakeoffs = div.querySelector(".takeoff-block:not([style*='display: none'])");
    div.style.display = visibleTakeoffs ? "" : "none";
});

  // -----------------------------------------------------
  // Hide empty elevation → hide empty takeoff → hide empty division
  // -----------------------------------------------------
function collapseEmptyGroups() {
    document.querySelectorAll(".elevation-block").forEach(block => {
        const visibleChild = block.querySelector(
            ".revision-item:not([style*='display: none'])"
        );
        block.style.display = visibleChild ? "" : "none";
    });

    document.querySelectorAll(".takeoff-block").forEach(block => {
        const visibleChild = block.querySelector(
            ".elevation-block:not([style*='display: none'])"
        );
        block.style.display = visibleChild ? "" : "none";
    });

    document.querySelectorAll(".division-block").forEach(block => {
        const visibleChild = block.querySelector(
            ".takeoff-block:not([style*='display: none'])"
        );
        block.style.display = visibleChild ? "" : "none";
    });
}


  // Attach filters
  statusFilter?.addEventListener("change", applyAllFilters);
  builderFilter?.addEventListener("change", applyAllFilters);
  branchFilter?.addEventListener("change", applyAllFilters);
searchFilter?.addEventListener("input", () => {
    // Only update filter state and run local filtering
    applyAllFilters();
});


  // Reapply after table render
  window.applyFiltersAfterRender = applyAllFilters;
});
