// ------------------ FILTER LOGIC (with logs) ------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Filter logic initialized");

  const draftCard = document.getElementById("in-draft-card");
  const statusFilter = document.getElementById("status-filter");
  const tableBody = document.getElementById("takeoff-table");

  console.log("🎯 Elements found:", {
    draftCard: !!draftCard,
    statusFilter: !!statusFilter,
    tableBody: !!tableBody
  });

  if (!draftCard || !statusFilter || !tableBody) {
    console.warn("⚠️ Missing required element(s) for filter logic");
    return;
  }

  // Helper function to filter rows based on selected status
  const filterTable = (status) => {
    console.log(`📊 Filtering table for status: "${status || 'All'}"`);

    const rows = tableBody.querySelectorAll("tr");
    let visibleCount = 0;

    rows.forEach((row, idx) => {
      const statusCell = row.querySelector("td:nth-child(6)");
      const text = statusCell ? statusCell.innerText.trim() : "";

      const match = !status || text.toLowerCase() === status.toLowerCase();
      row.style.display = match ? "" : "none";
      if (match) visibleCount++;

      console.log(`  🔍 Row ${idx + 1}: status="${text}" → ${match ? "✅ shown" : "❌ hidden"}`);
    });

    console.log(`📈 Total visible rows: ${visibleCount}/${rows.length}`);
  };

  // Click “In Draft” card → set dropdown + filter table
  draftCard.addEventListener("click", () => {
    console.log("🖱️ 'In Draft' card clicked");
    statusFilter.value = "Draft";
    console.log("📥 Dropdown set to:", statusFilter.value);
    filterTable("Draft");
  });

  // Change in dropdown → re-filter table
  statusFilter.addEventListener("change", (e) => {
    console.log("🔄 Dropdown changed:", e.target.value);
    filterTable(e.target.value);
  });

  console.log("✅ Filter logic ready and waiting for user input");
});
