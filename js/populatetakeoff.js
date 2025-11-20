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
let estimatorLookup = {};
const ESTIMATOR_TABLE_ID1 = "tbl1ymzV1CYldIGJU";

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
    console.error("❌ Failed to load existing takeoff");
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

  // 🔥 Load the UPDATED JSON from Airtable
  // Load the updated Imported JSON instead of old SKU table
if (f["Imported JSON"]) {
    try {
        const json = JSON.parse(f["Imported JSON"]);
        console.log("📦 Loaded Imported JSON with", json.length, "rows");
        populateLineItemsFromJson(json);
    } catch (err) {
        console.error("❌ Failed to parse Imported JSON:", err);
    }
}

}

function populateLineItemsFromJson(jsonArray) {
    console.log("🔄 Populating line items from Imported JSON…");

    const tbody = document.querySelector("#line-item-body");
    tbody.innerHTML = "";

    jsonArray.forEach((item, index) => {
        const row = document.createElement("tr");
        row.classList.add("border-b");

        row.innerHTML = `
            <td><input class="sku-input w-full" value="${item.SKU || ""}"></td>
            <td><input class="desc-input w-full" value="${item.Description || ""}"></td>
            <td><input class="uom-input w-full" value="${item.UOM || ""}"></td>
            <td><input class="mat-input w-full" value="${item["Description 2 (ex-color)"] || ""}"></td>
            <td><input class="color-input w-full" value="${item["Color Group"] || ""}"></td>
            <td><input class="vendor-input w-full" value="${item.Vendor || ""}"></td>

            <td><input class="qty-input w-full" type="number" value="${item.QTY ?? 1}"></td>

            <td><input class="cost-input w-full" type="number" value="${item["Unit Cost"] ?? 0}"></td>
            <td><input class="total-cost-input w-full" type="number" value="${item["Total Cost"] ?? 0}"></td>

            <td><button class="delete-row-btn text-red-500">🗑</button></td>
        `;

        tbody.appendChild(row);
    });

    console.log("✔ Line items successfully populated from JSON");
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

    // --- Primary display name ---
    const takeoffName =
        f["Takeoff Name"] ||
        f["Plan Name"] ||
        f["Takeoff Creation"] ||
        f["Takeoff Creation 2"] ||
        "Untitled";

    // --- Safe Builder handling (lookup or text) ---
    let builder = "";
    if (Array.isArray(f.Builder)) {
        builder = f.Builder.join(", ");
    } else if (typeof f.Builder === "string") {
        builder = f.Builder;
    }

    // --- Safe Community handling ---
    let community =
        f.Community ||
        f["Community (from ...)"] ||
        (Array.isArray(f.Community) ? f.Community.join(", ") : "") ||
        "";

    // --- Plans + Elevations from your formula fields ---
    const plans = f.Plans || "";
    const elevations = f.Elevations || "";

    // --- SKU Count ---
    const skuCount = getSkuCountFromTakeoffFields(f);

    return `
    <tr data-id="${id}">

      <!-- SELECT CHECKBOX -->
      <td class="py-3 px-3">
        <input type="checkbox"
               class="takeoff-select-checkbox"
               data-record-id="${id}">
      </td>

      <!-- ACTIVE DOT -->
      <td class="py-3 px-3">
        <div class="w-3 h-3 rounded-full mx-auto cursor-pointer active-toggle 
        ${active ? "bg-green-500" : "bg-gray-300"}"></div>
      </td>

      <!-- TAKEOFF NAME + DIVISION -->
      <td class="py-3 px-3">
        <div class="font-semibold text-gray-800">${takeoffName}</div>
        <div class="text-xs text-gray-500">${division}</div>
      </td>

      <!-- TYPE BADGE -->
      <td class="py-3 px-3">
        <span class="px-2 py-1 bg-black text-white text-xs rounded-md">${type}</span>
      </td>

      <!-- BUILDER, COMMUNITY, PLANS, ELEVATIONS, SKU COUNT -->
      <td class="py-3 px-3">
        <div class="font-medium">${builder || "—"}</div>
        <div class="text-xs text-gray-500">${community || "—"}</div>

        <div class="text-xs text-gray-600 mt-1">
            <strong>Plans:</strong> ${plans || "—"}
        </div>
        <div class="text-xs text-gray-600">
            <strong>Elevations:</strong> ${elevations || "—"}
        </div>

        <div class="text-xs text-blue-600 font-semibold mt-1">
          ${skuCount} SKU${skuCount === 1 ? "" : "s"}
        </div>
      </td>

      <!-- STATUS DROPDOWN -->
      <td class="py-3 px-3">
        <select class="status-select border rounded px-2 py-1 text-xs">
          <option value="Complete" ${status === "Complete" ? "selected" : ""}>Complete</option>
          <option value="Draft" ${status === "Draft" ? "selected" : ""}>Draft</option>
        </select>
      </td>

      <!-- COST -->
      <td class="py-3 px-3 text-right">${formatMoney(totalCost)}</td>

      <!-- MARGIN -->
      <td class="py-3 px-3 text-right text-orange-600 font-medium">
        ${margin}%
      </td>

      <!-- LAST UPDATED -->
      <td class="py-3 px-3 text-right">
        <div>${updated}</div>
        <div class="text-xs text-gray-500">by ${updatedBy}</div>
      </td>

      <!-- EDIT BUTTON -->
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

// Linked fields are arrays → convert safely to text
function safeLinked(field) {
    if (!field) return "—";
    if (Array.isArray(field)) return field.join(", ");
    return field;
}
async function fetchEstimators() {
    let records = [];
    let offset = null;
console.log("Fetching estimators…");

    do {
        const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${ESTIMATOR_TABLE_ID1}`);
        url.searchParams.set("pageSize", "100");
        if (offset) url.searchParams.set("offset", offset);

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
        });

        const data = await res.json();
        records = records.concat(data.records);
        offset = data.offset;

    } while (offset);

    // Build lookup: recordId → Full Name
    records.forEach(rec => {
        const fullName = rec.fields["Full Name"] || "Unknown Estimator";
        estimatorLookup[rec.id] = fullName;
    });

}

function renderGroupedRow(group) {
    const takeoffName = group.name;
    const revisions = group.revisions;

    let html = `
        <td colspan="12" class="py-3 px-3">
            <div class="font-semibold text-gray-900 cursor-pointer rev-toggle flex items-center gap-2">
                <span class="toggle-arrow">▶</span>
                ${takeoffName}
                <span class="text-sm text-gray-500 ml-1">
                    (${revisions.length} revisions)
                </span>
            </div>

            <div class="ml-8 hidden revision-list mt-2 border-l border-gray-200 pl-4">
    `;

    revisions.forEach(rec => {
    const f = rec.fields;
    const id = rec.id;

    const rev = f["Revision #"] || 1;

const builder = f.Builder && f.Builder.length > 0
    ? builderLookup[f.Builder[0]] || "—"
    : "—";
const estimator = f.Estimator && f.Estimator.length > 0
    ? estimatorLookup[f.Estimator[0]] || "—"
    : "—";
    const community = safeLinked(f.Community || f["Community (from ...)"]);
    const plans = f.Plans || "";
    const elevations = f.Elevations || "";
    const skuCount = getSkuCountFromTakeoffFields(f);
    const latest = rec === group.latest;


    html += `
        <div class="flex items-center gap-4 py-2">

            <input type="checkbox"
                   class="takeoff-select-checkbox h-4 w-4"
                   data-record-id="${id}">

            <div class="font-medium text-gray-800 min-w-[110px]">
                Revision ${rev}
                ${latest ? `<span class="text-xs text-green-600">(latest)</span>` : ""}
            </div>

            <div class="text-xs text-gray-500 flex flex-col leading-4">
                <span><strong>Builder:</strong> ${builder}</span>
                <span><strong>Estimator:</strong> ${estimator}</span>
                <span><strong>Community:</strong> ${community}</span>
                <span><strong>Plans:</strong> ${plans}</span>
                <span><strong>Elevations:</strong> ${elevations}</span>
                <span><strong>SKUs:</strong> ${skuCount}</span>
            </div>

            <button class="edit-btn text-blue-600 underline ml-auto" data-id="${id}">
                Edit
            </button>
        </div>
    `;
});


    html += `
            </div>
        </td>
    `;

    return html;
}

function enableRevisionToggles() {
    document.querySelectorAll(".rev-toggle").forEach(toggle => {
        toggle.addEventListener("click", () => {
            
            const arrow = toggle.querySelector(".toggle-arrow"); // FIXED
            const list = toggle.parentElement.querySelector(".revision-list");

            if (!arrow || !list) return; // Safety check

            const isHidden = list.classList.contains("hidden");

            if (isHidden) {
                list.classList.remove("hidden");
                arrow.textContent = "▼";
            } else {
                list.classList.add("hidden");
                arrow.textContent = "▶";
            }
        });
    });
}

function renderPaginatedTable() {
    // 1. Apply filters to ALL takeoff records
    const filtered = applyFilters(allTakeoffRecords);

    // 2. Group them by Takeoff Name (combine all revisions)
    const revisionGroups = groupRevisions(filtered);

    // 3. Build branch → [groups] structure using the LATEST revision
    const branchBuckets = {};

    revisionGroups.forEach(group => {
        const latest = group.latest.fields;
        const branch = latest["Division"] || "Unknown";

        if (!branchBuckets[branch]) {
            branchBuckets[branch] = [];
        }

        branchBuckets[branch].push(group);
    });

    // 4. Construct HTML for the table
    let html = "";

    Object.entries(branchBuckets).forEach(([branch, groups]) => {
        const groupId = branch.replace(/\s+/g, "-").toLowerCase();

        // Branch header row (click to collapse/expand)
        html += `
            <tr class="bg-gray-100 cursor-pointer" data-group="${groupId}">
                <td colspan="10" class="py-3 px-4 font-semibold text-gray-800">
                    ${branch} — 
                    <span class="text-blue-600">${groups.length} Takeoffs</span>
                </td>
            </tr>
        `;

        // Render grouped takeoffs inside this branch
        groups.forEach(group => {
            html += `
                <tr class="branch-row hidden group-${groupId}">
                    ${renderGroupedRow(group)}
                </tr>
            `;
        });
    });

    // 5. Update DOM
    tableBody.innerHTML = html;

    // 6. Re-enable interactions
    enableRowInteractions();
    enableGroupToggles();
     enableRevisionToggles();

    // 7. Update dashboard stats
    document.getElementById("total-takeoff-count").textContent = revisionGroups.length;
    document.getElementById("draft-takeoff-count").textContent =
        revisionGroups.filter(g => g.latest.fields["Status"] === "Draft").length;
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
    await fetchBuilders();     // loads builder lookup
    await fetchEstimators();   // MUST load before rendering the table
    await populateTakeoffTable();  // now estimatorLookup is full

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

// ============================================================
// 🔵 UPDATE PRICING FEATURE
// ============================================================

// 1. Load Excel Sheet (LOSKUDATA.xlsx)
async function loadSkuPricingFromExcel() {
    const url =
      "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv";

    try {
    
        const response = await fetch(url, { cache: "no-cache" });

        if (!response.ok) {
            console.error("❌ Price sheet request failed:", response.status);
            alert("Could not fetch live pricing sheet.");
            return null;
        }

        const csvText = await response.text();

        // Parse CSV into rows
        const rows = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        }).data;

        // Build price map: SKU → { vendor, price }
        const priceMap = {};

        rows.forEach(row => {
            const sku = String(row["SKU"] || "").trim();
            const vendor = String(row["Vendor"] || "").trim();
            const price = Number(row["Unit Cost"] || row["Cost"] || 0);

            if (!sku) return; // Skip empty rows

            priceMap[sku] = {
                vendor,
                price
            };
        });
        return priceMap;

    } catch (err) {
        console.error("❌ Error parsing pricing sheet:", err);
        alert("Failed to load pricing sheet. Check console.");
        return null;
    }
}

// 2. Read selected takeoffs
function getSelectedTakeoffs() {
    return [...document.querySelectorAll(".takeoff-select-checkbox:checked")]
        .map(cb => cb.dataset.recordId);
}

// 3. Fetch takeoff JSON
async function fetchTakeoffJson(recordId) {
    const res = await fetch(
        `https://api.airtable.com/v0/${BASE_ID}/${TAKEOFFS_TABLE_ID}/${recordId}`,
        {
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
        }
    );

    const data = await res.json();
    if (data.error) {
        console.error("🔥 Airtable read error:", data.error);
        return null;
    }

    return data;
}

// 4. CREATE NEW REVISION RECORD
async function createNewRevision(oldRecord, newJson, newRevision) {
    const fields = oldRecord.fields;

    const newFields = {
        "Takeoff Name": fields["Takeoff Name"],
        "Type": fields["Type"],
        "Builder": fields["Builder"],
        "Plan": fields["Plan"],
        "Elevation": fields["Elevation"],
        "Community": fields["Community"],
        "Status": "Draft",
        "Revision #": newRevision,
        "Imported JSON": JSON.stringify(newJson)
    };

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TAKEOFFS_TABLE_ID}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ fields: newFields })
    });

    const data = await res.json();
    return data;
}

// 5. UPDATE PRICING IN JSON
function updateJsonPricing(importedJson, priceMap) {
    console.group("📦 updateJsonPricing() Debug");
    console.log("➡ importedJson received:", importedJson);
    console.log("➡ priceMap received:", priceMap);

    if (!Array.isArray(importedJson)) {
        console.error("❌ importedJson is NOT an array:", importedJson);
        console.groupEnd();
        return null;
    }
    if (!priceMap || typeof priceMap !== "object") {
        console.error("❌ priceMap is invalid:", priceMap);
        console.groupEnd();
        return null;
    }

    const updated = [];

    importedJson.forEach((row, idx) => {
        console.group(`SKU Row #${idx}`, row);

        const sku = row.SKU || row["sku"] || row["Sku"] || null;

        console.log("🔍 Row SKU:", sku);

        if (!sku) {
            console.warn("⚠ Missing SKU — row skipped.");
            updated.push(row);
            console.groupEnd();
            return;
        }

        const priceEntry = priceMap[sku];

        console.log("🔍 priceMap lookup result:", priceEntry);

        if (!priceEntry) {
            console.log("ℹ No price found for SKU → no change.");
            row.__priceChanged = false;
            updated.push(row);
            console.groupEnd();
            return;
        }

        const oldCost = Number(row["Unit Cost"] || 0);
const newCost = Number(
    priceEntry.price ??
    priceEntry.Price ??
    priceEntry.cost ??
    priceEntry.Cost ??
    0
);

        console.log(`💲 oldCost:${oldCost} → newCost:${newCost}`);

       if (oldCost !== newCost) {
    console.log("✨ PRICE CHANGED!");
    row.__priceChanged = true;

    row.__sku = sku;
    row.__vendor = priceEntry.vendor;
    row.__qty = row.QTY ?? row.qty ?? row["Qty"];

    row.__oldCost = oldCost;
    row.__newCost = newCost;

    row["Unit Cost"] = newCost;
} else {
    row.__priceChanged = false;
}


        updated.push(row);
        console.groupEnd();
    });

    console.log("📦 updateJsonPricing() FINAL OUTPUT:", updated);
    console.groupEnd();

    return updated;
}


// ===================== PROGRESS MODAL CONTROL =====================
function showProgressModal() {
    document.getElementById("pricing-progress-modal").classList.remove("hidden");
}

function hideProgressModal() {
    document.getElementById("pricing-progress-modal").classList.add("hidden");
}

function updateProgressUI(current, total, skuCurrent, skuTotal, startTime) {
    const percent = Math.floor((current / total) * 100);

    const bar = document.getElementById("pricing-progress-bar");
    const text = document.getElementById("pricing-progress-text");
    const sub = document.getElementById("pricing-progress-sub");

    bar.style.width = percent + "%";
    text.textContent = `Processing Takeoff ${current} of ${total}`;

    // SKU progress
    if (skuTotal > 0) {
        sub.textContent = `Processing SKU ${skuCurrent} of ${skuTotal}`;
    }

    // Estimate remaining time
    if (current > 1) {
        const elapsed = (Date.now() - startTime) / 1000;
        const avgTime = elapsed / (current - 1);
        const remaining = Math.ceil(avgTime * (total - current));

        sub.textContent += ` — Estimated Time Left: ${remaining}s`;
    }
}

// ------------------------------------------------------------
// MAIN BUTTON HANDLER
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("🔵 DOM Loaded → Pricing Update Handler Ready");

    const updateBtn = document.querySelector("#update-pricing-btn");
    if (!updateBtn) {
        console.warn("⚠️ No #update-pricing-btn found.");
        return;
    }

    updateBtn.addEventListener("click", async () => {
        console.log("\n=============================");
        console.log("🟦 UPDATE PRICING CLICKED");
        console.log("=============================\n");

        console.log("📌 getSelectedTakeoffs() returned:", getSelectedTakeoffs());

        console.log("📌 All checkboxes detected:", 
            document.querySelectorAll(".takeoff-select-checkbox")
        );

        const selected = getSelectedTakeoffs();
        if (!selected.length) {
            console.warn("❗ No takeoffs selected.");
            alert("❗ Select at least one takeoff first.");
            return;
        }

        console.log(`📦 ${selected.length} takeoff(s) selected:`, selected);

        // ------------------------------
        // Show progress modal
        // ------------------------------
        console.log("📤 Showing progress modal...");
        showProgressModal();

        // Load pricing from Google Sheet
        console.log("📄 Loading CSV → price map...");
        const priceMap = await loadSkuPricingFromExcel();

        if (!priceMap) {
            hideProgressModal();
            console.error("❌ loadSkuPricingFromExcel() returned:", priceMap);
            alert("❌ Could not load live pricing sheet.");
            return;
        }

        console.log("📄 CSV → Price Map loaded successfully:", priceMap);

        let startTime = Date.now();

        // ---------------------------------------------------
        // MAIN TAKEOFF LOOP
        // ---------------------------------------------------
        for (let i = 0; i < selected.length; i++) {
            console.log("\n-------------------------------------");
            console.log(`▶ Processing takeoff #${i + 1} of ${selected.length}`);
            console.log("-------------------------------------");

            const recordId = selected[i];
            console.log("📌 Current Record ID:", recordId);

            updateProgressUI(i + 1, selected.length, 0, 0, startTime);

            // Fetch takeoff from Airtable
            console.log("📡 Fetching takeoff JSON:", recordId);
            const existing = await fetchTakeoffJson(recordId);

            if (!existing) {
                console.warn(`⚠️ fetchTakeoffJson(${recordId}) returned null`);
                continue;
            }

            console.log("📥 Takeoff fetched:", existing);

            const fields = existing.fields;
            const takeoffName = fields["Takeoff Name"] || "Untitled Takeoff";

            console.log(`📄 Takeoff Name: ${takeoffName}`);
            console.log("📄 Revision #:", fields["Revision #"]);
            console.log("📄 Imported JSON length:", (fields["Imported JSON"] || "[]").length);

            // Parse JSON safely
            let importedJson = [];
            try {
                importedJson = JSON.parse(fields["Imported JSON"] || "[]");
            } catch (err) {
                console.error("❌ JSON parse error:", err);
                continue;
            }

            console.log(`📘 Imported JSON parsed. SKUs: ${importedJson.length}`);

            const skuTotal = importedJson.length;

            // Update JSON pricing
            console.log("🔄 Running updateJsonPricing()...");
            const updatedJson = updateJsonPricing(importedJson, priceMap);

            console.log("🔍 updateJsonPricing() result:", updatedJson);

            if (!updatedJson || !Array.isArray(updatedJson)) {
                console.warn(`⚠ updateJsonPricing() returned invalid data — skipping ${takeoffName}`);
                continue;
            }

            const changesDetected = updatedJson.some(item => item.__priceChanged === true);
            console.log("📌 changesDetected:", changesDetected);

            const changedSkus = updatedJson.filter(i => i.__priceChanged);
            console.group(`🔎 SKU Price Changes for ${takeoffName}`);
            changedSkus.forEach(item => {
                console.log(
                    `SKU: ${item.__sku} | Vendor: ${item.__vendor} | `
                    + `Old: ${item.__oldCost} → New: ${item.__newCost} | `
                    + `Qty: ${item.__qty}`
                );
            });
            console.groupEnd();

            if (!changesDetected) {
                console.log(`📭 No pricing differences in ${takeoffName} → No revision created.`);
                continue;
            }

            // Create new revision
            const oldRevision = Number(fields["Revision #"] || 0);
            const newRevision = oldRevision + 1;

            console.log(`💾 Preparing to create revision ${newRevision} for ${takeoffName}`);

            const result = await createNewRevision(existing, updatedJson, newRevision);

            console.log("📡 createNewRevision() response:", result);

            // Update SKU progress
            for (let s = 0; s < skuTotal; s++) {
                updateProgressUI(i + 1, selected.length, s + 1, skuTotal, startTime);
            }

            console.log(`✔ Finished updating ${takeoffName}`);
        }

        console.log("\n🎉 All takeoffs processed.\n");

        hideProgressModal();

    });
});


function groupRevisions(records) {
    const groups = {};

    records.forEach(rec => {
        const name = rec.fields["Takeoff Name"] || "Untitled";

        if (!groups[name]) {
            groups[name] = {
                name,
                revisions: [],
                latest: null
            };
        }

        // Normalize revision value
        rec._rev = Number(
            rec.fields["Revision #"] ??
            rec.fields["Revision"] ??
            0
        );

        groups[name].revisions.push(rec);
    });

    Object.values(groups).forEach(g => {
        // Sort highest → lowest
        g.revisions.sort((a, b) => b._rev - a._rev);

        // Highest revision always the latest
        g.latest = g.revisions[0];
    });

    return Object.values(groups);
}

