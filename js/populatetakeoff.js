// ------------------------- CONFIG -------------------------
const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID = "appnZNCcUAJCjGp7L";

let builderLookup = {};  // recId → Client Name
const BUILDERS_TABLE_ID = "tblDkASnuImCKBQyO"; // ⭐ your source table

// ⭐ The correct table for Takeoff List
const TAKEOFFS_TABLE_ID = "tblZpnyqHJeC1IaZq";

// Target table body in takeoff.html
const tableBody = document.getElementById("takeoff-table");

if (!tableBody) {
  console.error("❌ Missing #takeoff-table in takeoff.html");
}

// ------------------------- PAGINATION STATE -------------------------
let currentPage = 1;
let pageSize = 20;             // 🔧 Change to 10 / 50 / 100 if you like
let allTakeoffRecords = [];    // ← holds ALL records from Airtable
let paginatedRecords = [];     // ← only records for the current page

// ------------------------- FETCH BUILDERS -------------------------
async function fetchBuilders() {
  let records = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;

  } while (offset);

  // Create lookup map
  records.forEach(rec => {
    const clientName = rec.fields["Client Name"] || "Unknown Builder";
    builderLookup[rec.id] = clientName;
  });

  console.log(`🏗️ Loaded ${records.length} builders`);
}

// ------------------------- FETCH TAKEOFFS -------------------------
async function fetchTakeoffs() {
  let records = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TAKEOFFS_TABLE_ID}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!res.ok) {
      console.error("❌ Error fetching takeoffs:", await res.text());
      return [];
    }

    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;

  } while (offset);

  console.log(`📦 Loaded ${records.length} takeoff records from tblZpnyqHJeC1IaZq`);
  return records;
}

// ------------------------- FORMATTERS -------------------------
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(num) {
  const v = parseFloat(num);
  return isNaN(v) ? "$0.00" : `$${v.toLocaleString()}`;
}

// ------------------------- RENDER ROW -------------------------
function renderRow(rec) {
  const f = rec.fields;
  const id = rec.id;

  const active = f["Active"] === true;
  const type = f["Type"] || "";
  const division = f["Division (from Name)"] || "";
  const status = f["Status"] || "Draft";

  const totalCost = f["Total cost"] || 0;
  const margin = f["Margin"] || 0;

  const updated = formatDate(f["Last updated"]);
  const updatedBy = f["Last Modified by"] || "";

  // --- Extract primary values first ---
  const takeoffName =
    f["Takeoff Creation"] ||
    f["Takeoff Creation 2"] ||
    f["Takeoff Name"] ||
    "Untitled";

  let builder = "";
  if (Array.isArray(f["Builder"]) && f["Builder"].length > 0) {
    const builderId = f["Builder"][0];
    builder = builderLookup[builderId] || builderId;
  }
  const community = f["Community"] || "";

  // --- Determine planName for grouping counts ---
  const planName = f["Takeoff Name"] || takeoffName;

  // --- Get count for this plan ---
  const takeoffCount = window.takeoffCounts?.[planName] || 1;

  return `
    <tr data-id="${id}">
      <td class="py-3 px-3">
        <input type="checkbox">
      </td>

      <!-- ✅ Click to toggle active -->
      <td class="py-3 px-3">
        <div class="w-3 h-3 rounded-full mx-auto cursor-pointer active-toggle ${active ? "bg-green-500" : "bg-gray-300"}"></div>
      </td>

      <td class="py-3 px-3">
        <div class="font-semibold text-gray-800">${takeoffName}</div>
        <div class="text-xs text-gray-500">${division}</div>
      </td>

      <td class="py-3 px-3">
        <span class="px-2 py-1 bg-black text-white text-xs rounded-md">${type}</span>
      </td>

      <td class="py-3 px-3">
        <div class="font-medium">${builder}</div>
        <div class="text-xs text-gray-500">${community}</div>

        <!-- NEW ⭐ Takeoff Count Line -->
        <div class="text-xs text-blue-600 font-semibold mt-1">
          ${takeoffCount} takeoff${takeoffCount === 1 ? "" : "s"}
        </div>
      </td>

      <!-- ✅ Editable Status Dropdown -->
      <td class="py-3 px-3">
        <select class="status-select border rounded px-2 py-1 text-xs">
          <option value="Complete" ${status === "Complete" ? "selected" : ""}>Complete</option>
          <option value="Draft" ${status === "Draft" ? "selected" : ""}>Draft</option>
        </select>
      </td>

      <td class="py-3 px-3 text-right">${formatMoney(totalCost)}</td>

      <td class="py-3 px-3 text-right text-orange-600 font-medium">
        ${margin}%
      </td>

      <td class="py-3 px-3 text-right">
        <div>${updated}</div>
        <div class="text-xs text-gray-500">by ${updatedBy}</div>
      </td>

      <td class="py-3 px-3 text-right">⋮</td>
    </tr>
  `;
}

// ------------------------- ROW INTERACTIONS -------------------------
function enableRowInteractions() {
  document.querySelectorAll(".active-toggle").forEach(dot => {
    dot.addEventListener("click", () => {
      const row = dot.closest("tr");
      const recId = row.dataset.id;
      const isActive = dot.classList.contains("bg-green-500");

      const newValue = !isActive;
      dot.classList.toggle("bg-green-500", newValue);
      dot.classList.toggle("bg-gray-300", !newValue);

      updateTakeoff(recId, { Active: newValue });
    });
  });

  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", () => {
      const row = sel.closest("tr");
      const recId = row.dataset.id;
      const newStatus = sel.value;

      updateTakeoff(recId, { Status: newStatus });
    });
  });
}

// ------------------------- UPDATE RECORD -------------------------
async function updateTakeoff(recordId, fields) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TAKEOFFS_TABLE_ID}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!res.ok) {
    console.error("❌ Error updating Airtable:", await res.text());
    alert("Update failed. See console.");
  } else {
    console.log("✅ Updated:", fields);
  }
}

// ------------------------- COUNT TAKEOFFS PER PLAN -------------------------
function countTakeoffsByPlan(records) {
  const counts = {};

  records.forEach(rec => {
    const f = rec.fields;
    const planName =
      f["Plan Name"] ||
      f["Takeoff Creation"] ||
      f["Takeoff Creation 2"] ||
      "Unknown";

    if (!counts[planName]) counts[planName] = 0;
    counts[planName]++;
  });

  return counts;
}

// ------------------------- RENDER PAGINATED TABLE -------------------------
function renderPaginatedTable() {
  const total = allTakeoffRecords.length;

  if (!total) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="py-4 px-3 text-center text-gray-500">
          No takeoffs found.
        </td>
      </tr>
    `;
  } else {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    paginatedRecords = allTakeoffRecords.slice(start, end);
    tableBody.innerHTML = paginatedRecords.map(renderRow).join("");

    enableRowInteractions();
  }

  // 🔢 Update total + page info
  const totalSpan = document.getElementById("takeoff-total");
  if (totalSpan) {
    totalSpan.textContent = `Total Records: ${total}`;
  }

  const pageInfo = document.getElementById("page-info");
  if (pageInfo) {
    const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / pageSize));
    pageInfo.textContent =
      total > 0
        ? `Page ${currentPage} of ${totalPages}`
        : "Page 1 of 1";
  }

  // 📊 Update stat cards if they exist
  const totalCard = document.getElementById("total-takeoff-count");
  if (totalCard) {
    totalCard.textContent = total;
  }

  const draftCount = allTakeoffRecords.filter(
    r => r.fields["Status"] === "Draft"
  ).length;
  const draftCard = document.getElementById("draft-takeoff-count");
  if (draftCard) {
    draftCard.textContent = draftCount;
  }
}

// ------------------------- MAIN RENDER FUNCTION -------------------------
async function populateTakeoffTable() {
  tableBody.innerHTML = `...loading...`;

  const records = await fetchTakeoffs();
  window.takeoffCounts = countTakeoffsByPlan(records);

  allTakeoffRecords = records;
  currentPage = 1;  // reset to first page
  renderPaginatedTable();

  console.log("✅ Takeoff table populated with pagination");
}

// ------------------------- INIT -------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await fetchBuilders();         // ⭐ loads linked table
  await populateTakeoffTable();  // ⭐ renders table with pagination

  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPaginatedTable();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(allTakeoffRecords.length / pageSize);
      if (currentPage < totalPages) {
        currentPage++;
        renderPaginatedTable();
      }
    });
  }
});
