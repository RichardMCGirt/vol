// ------------------------- CONFIG -------------------------
const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID = "appnZNCcUAJCjGp7L";
const SKU_TABLE_ID = "tblZpnyqHJeC1IaZq";
let filters = {
  search: "",
  builder: "",
  status: "",
  type: "",
  branch: ""
};

let builderLookup = {}; 
const BUILDERS_TABLE_ID = "tblDkASnuImCKBQyO"; 

// ⭐ The correct table for Takeoff List
const TAKEOFFS_TABLE_ID = "tblZpnyqHJeC1IaZq";

// Target table body in takeoff.html
const tableBody = document.getElementById("takeoff-table");

if (!tableBody) {
  console.error("❌ Missing #takeoff-table in takeoff.html");
}

// ------------------------- PAGINATION STATE -------------------------
let currentPage = 1;
let pageSize = 20;            
let allTakeoffRecords = [];   
let paginatedRecords = [];     

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
async function getSkuCountFromJsonRecord(recordId) {
  console.log("🟦 Fetching JSON for:", recordId);

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${SKU_TABLE_ID}/${recordId}`,
    {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    }
  );

  if (!res.ok) {
    console.error("❌ Error fetching SKU JSON row:", await res.text());
    return 0;
  }

  const data = await res.json();

  console.log("📄 JSON Record Data:", data);

  const jsonStr = data.fields["Imported JSON"];

  console.log("📜 Imported JSON Field Raw:", jsonStr);

  if (!jsonStr) {
    console.warn("⚠ No Imported JSON found for:", recordId);
    return 0;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    console.log("🔍 Parsed JSON:", parsed);

    if (Array.isArray(parsed)) {
      console.log("📦 SKU Count:", parsed.length);
      return parsed.length;
    }

    console.warn("⚠ Imported JSON is NOT an array!", parsed);
    return 0;

  } catch (err) {
    console.error("❌ JSON Parse Error:", err);
    return 0;
  }
}

// ------------------------- GROUP BY BRANCH -------------------------
function applyFilters(records) {
  return records.filter(rec => {
    const f = rec.fields;

    const name = (f["Takeoff Name"] || "").toLowerCase();
    const builder = builderLookup[f["Builder"]?.[0]] || "";
    const status = f["Status"] || "";
    const type = f["Type"] || "";
    const branch = f["Division (from Name)"] || "";

    // Search filter
    if (filters.search && !name.includes(filters.search.toLowerCase())) {
      return false;
    }

    // Builder filter
    if (filters.builder && builder !== filters.builder) {
      return false;
    }

    // Status filter
    if (filters.status && status !== filters.status) {
      return false;
    }

    // Type filter
    if (filters.type && type !== filters.type) {
      return false;
    }

    // Branch filter
    if (filters.branch && branch !== filters.branch) {
      return false;
    }

    return true;
  });
}

function groupByBranch(records) {
  const groups = {};

  records.forEach(rec => {
    const branch = rec.fields["Division (from Name)"] || "Unknown";

    if (!groups[branch]) groups[branch] = [];
    groups[branch].push(rec);
  });

  return groups;
}

async function loadExistingTakeoff(recId) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TAKEOFFS_TABLE_ID}/${recId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
  });

  if (!res.ok) {
    console.error("Failed to load existing takeoff");
    return;
  }

  const data = await res.json();
  const f = data.fields;

  // Fill header fields
  nameInput.value = f["Takeoff Name"] || "";
  typeSelect.value = f["Type"] || "";
  builderSelect.value = f["Builder Name"] || "";
  planSelect.value = f["Plan"] || "";
  elevationSelect.value = f["Elevation"] || "";
  communitySelect.value = f["Community"] || "";

  // Show line items section
  revealLineItemsSection();

  // Load SKU JSON (SKU table record)
  if (Array.isArray(f["Takeoff Creation"]) && f["Takeoff Creation"].length > 0) {
    loadSkuJsonRecord(f["Takeoff Creation"][0]);
  }
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
document.getElementById("create-takeoff-btn").addEventListener("click", () => {
  localStorage.removeItem("editingTakeoffId");
  window.location.href = "takeoff-creation.html";
});

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
    f["Takeoff Name"] ||     // ← ALWAYS use the actual text first
    f["Plan Name"] ||        // ← fallback if you want
    f["Takeoff Creation"] || // ← linked record LAST
    f["Takeoff Creation 2"] ||
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
let skuHtml = `<div class="text-xs text-gray-400">Loading SKUs...</div>`;

// --- Get count for this plan ---
const skuCount = getSkuCountFromTakeoffFields(f);

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
 <div id="sku-count-${id}" class="text-xs text-blue-600 font-semibold mt-1">
  ${skuCount} SKU${skuCount === 1 ? "" : "s"}
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

<td class="py-3 px-3 text-right">
  <button class="edit-btn text-blue-600 underline" data-id="${id}">
    Edit
  </button>
</td>
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
  document.querySelectorAll(".edit-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const recId = btn.dataset.id;

    // Save selected recordId
    localStorage.setItem("editingTakeoffId", recId);

    // Navigate to editor
    window.location.href = "takeoff-creation.html";
  });
});

}

// ------------------------- UPDATE RECORD -------------------------
async function updateTakeoff(recordId, fields) {
  // 1. Update Airtable
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
    return;
  }

  console.log("✅ Updated:", fields);

  // 2. Update local in-memory record so UI stays in sync
  const updatedRecord = await res.json();
  const index = allTakeoffRecords.findIndex(r => r.id === recordId);

  if (index !== -1) {
    allTakeoffRecords[index].fields = {
      ...allTakeoffRecords[index].fields,
      ...updatedRecord.fields,
    };
  }

  // 3. Recalculate counts (draft, totals, pagination, etc.)
  renderPaginatedTable();
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
  // 1. Apply filters
  const filtered = applyFilters(allTakeoffRecords);

  // 2. Group filtered results
  const groups = groupByBranch(filtered);

  let html = "";

  Object.entries(groups).forEach(([branch, records]) => {
    const groupId = branch.replace(/\s+/g, "-").toLowerCase();

    // Header
    html += `
      <tr class="bg-gray-100 cursor-pointer" data-group="${groupId}">
        <td colspan="10" class="py-3 px-4 font-semibold text-gray-800">
          ${branch} — <span class="text-blue-600">${records.length} Takeoffs</span>
        </td>
      </tr>
    `;

    // Records in that branch
    records.forEach(rec => {
      html += `
        <tr class="branch-row hidden group-${groupId}">
          ${renderRow(rec)}
        </tr>
      `;
    });
  });

  tableBody.innerHTML = html;

  enableRowInteractions();
  enableGroupToggles();

  // Update stat cards
  document.getElementById("total-takeoff-count").textContent = filtered.length;
  document.getElementById("draft-takeoff-count").textContent =
    filtered.filter(r => r.fields["Status"] === "Draft").length;
}

function enableGroupToggles() {
  document.querySelectorAll("[data-group]").forEach(header => {
    header.addEventListener("click", () => {
      const group = header.getAttribute("data-group");
      const rows = document.querySelectorAll(`.group-${group}`);

      rows.forEach(r => r.classList.toggle("hidden"));
    });
  });
}


// ------------------------- MAIN RENDER FUNCTION -------------------------
async function populateTakeoffTable() {
  tableBody.innerHTML = `...loading...`;

  const records = await fetchTakeoffs();
  window.takeoffCounts = countTakeoffsByPlan(records);

  allTakeoffRecords = records;
  window.allTakeoffRecords = allTakeoffRecords;

  currentPage = 1;  // reset to first page
  renderPaginatedTable();

  console.log("✅ Takeoff table populated with pagination");
}
// ------------------------- GROUP TOGGLE INTERACTION -------------------------
function enableGroupToggles() {
  document.querySelectorAll("[data-group]").forEach(header => {
    header.addEventListener("click", () => {
      const group = header.getAttribute("data-group");
      const rows = document.querySelectorAll(`.group-${group}`);

      rows.forEach(r => r.classList.toggle("hidden"));
    });
  });
}
function getSkuCountFromTakeoffFields(fields) {
  // Try a few likely field names
  let raw = fields["Imported JSON"] 
         || fields["Imported JSON (from Takeoffs)"] 
         || fields["Imported JSON (From Takeoffs)"];

  // Handle Airtable lookup-style arrays: ["[...]"]
  if (Array.isArray(raw)) {
    raw = raw[0];
  }

  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.length;
    }
    return 0;
  } catch (err) {
    console.error("❌ Error parsing Imported JSON on takeoff record:", err, raw);
    return 0;
  }
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
  // Populate Builder Filter
const builderFilter = document.getElementById("builder-filter");
Object.values(builderLookup).forEach(name => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  builderFilter.appendChild(opt);
});

// Populate Branch Filter
const branchFilter = document.getElementById("branch-filter");
const branches = [...new Set(allTakeoffRecords.map(r => r.fields["Division (from Name)"] || "Unknown"))];

branches.sort().forEach(branch => {
  const opt = document.createElement("option");
  opt.value = branch;
  opt.textContent = branch;
  branchFilter.appendChild(opt);
});
document.getElementById("search-filter").addEventListener("input", e => {
  filters.search = e.target.value;
  renderPaginatedTable();
});

document.getElementById("builder-filter").addEventListener("change", e => {
  filters.builder = e.target.value;
  renderPaginatedTable();
});

document.getElementById("status-filter").addEventListener("change", e => {
  filters.status = e.target.value;
  renderPaginatedTable();
});

document.getElementById("type-filter").addEventListener("change", e => {
  filters.type = e.target.value;
  renderPaginatedTable();
});

document.getElementById("branch-filter").addEventListener("change", e => {
  filters.branch = e.target.value;
  renderPaginatedTable();
});


});

