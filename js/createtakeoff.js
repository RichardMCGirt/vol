// ==========================================================
// createtakeoff.js  (FINAL STABLE VERSION)
// ==========================================================

// Google Sheet CSV for SKU master data
const TAKEOFF_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv";


// Airtable configs
const AIRTABLE_API_KEY2 =
  "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID2 = "appnZNCcUAJCjGp7L";
const TAKEOFFS_TABLE_ID2 = "tblZpnyqHJeC1IaZq";
const SKU_TABLE_ID2 = "tblZpnyqHJeC1IaZq"; // JSON table
const estimator = document.getElementById("estimator-select")?.value.trim() || "";

window.skuData = [];
let builderLookup = {};  
document.getElementById("manual-save-btn").addEventListener("click", saveTakeoff);
let estimatorId = "";
// ==========================================================
// MAIN APP INITIALIZATION
// ==========================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🎬 Takeoff Creation Page Ready");
    loadEstimatorsDropdown();

  // DOM elements
const nameInput = document.getElementById("nameInput");
const typeSelect = document.getElementById("takeoff-type");
const builderSelect = document.getElementById("builder-select");
const planSelect = document.getElementById("plan-select");
const elevationSelect = document.getElementById("elevation-select");
const communitySelect = document.getElementById("community-select");


  const placeholderBox = document.getElementById("placeholder-box");
  const lineItemsSection = document.getElementById("line-items-section");
  const lineItemBody = document.getElementById("line-item-body");
  const addLineItemBtn = document.getElementById("add-line-item");
document.addEventListener("DOMContentLoaded", loadEstimators);

  // MODE FLAGS
  let editingId = localStorage.getItem("editingTakeoffId");
  let isLoadingEditMode = false;
// Load builders immediately
populateBuilders();

// When Builder selected → Load Plans
builderSelect.addEventListener("change", e => {
    populatePlans(e.target.value);
});

// When Plan selected → Load Elevations
planSelect.addEventListener("change", () => {
    populateElevations(builderSelect.value, planSelect.value);
});

// When Elevation selected → Load Communities
elevationSelect.addEventListener("change", () => {
    populateCommunities(builderSelect.value, planSelect.value, elevationSelect.value);
});

  // ==========================================================
  // 1. LOAD SKU CSV DATA
  // ==========================================================
  await fetchSkuData();

  // ==========================================================
  // 2. IF EDIT MODE → LOAD TAKEOFF AFTER DROPDOWNS POPULATE
  // ==========================================================
 if (editingId) {
    console.log("📝 Edit Mode:", editingId);
    isLoadingEditMode = true;

    setTimeout(() => loadExistingTakeoff(editingId), 900);
}
async function getEstimatorRecordIdByName(name) {
    if (!name) return null;

    const url = `https://api.airtable.com/v0/${BASE_ID2}/tbl1ymzV1CYldIGJU?filterByFormula=${encodeURIComponent(
        `{Full Name} = "${name}"`
    )}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
    });

    const json = await res.json();

    if (!json.records.length) {
        console.warn("⚠️ No estimator found for:", name);
        return null;
    }

    return json.records[0].id; // EXACT match
}

  function safeParseImportedJSON(raw) {
    if (!raw) return [];

    let cleaned = raw;

    // If Airtable returns an array like ["..."]
    if (Array.isArray(cleaned)) {
        cleaned = cleaned[0];
    }

    // Remove accidental double-encoded arrays: "[\"{...}\"]"
    while (typeof cleaned === "string" && cleaned.trim().startsWith("[\"")) {
        try {
            cleaned = JSON.parse(cleaned)[0];
        } catch {
            break;
        }
    }

    // Remove leading/trailing quotes if JSON accidentally double-stringed
    if (typeof cleaned === "string" && cleaned.startsWith("\"") && cleaned.endsWith("\"")) {
        try {
            cleaned = JSON.parse(cleaned);
        } catch {}
    }

    // Final actual parse of array of objects
    try {
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn("❌ Failed to parse Imported JSON. Raw value was:", raw);
        return []; // fail-safe fallback
    }
}
function normalizeRow(row) {
    const normalized = { ...row };

    // Normalize Qty (uppercase)
    if (row.QTY === undefined && row.Qty !== undefined) {
        normalized.QTY = Number(row.Qty) || 0;
        delete normalized.Qty;
    }

    if (normalized.QTY === undefined) {
        normalized.QTY = 0;
    }

    // Normalize Vendor
    if (normalized.Vendor === undefined) {
        normalized.Vendor = "";
    }

    return normalized;
}

async function fetchAllTakeoffs() {
    const url = `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}?pageSize=100`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
    });

    const json = await res.json();
    return json.records.map(r => r.fields);
}
async function populateBuilders() {
    const all = await fetchAllTakeoffs();

    builderLookup = {}; // reset

    all.forEach(t => {
        if (Array.isArray(t.Builder)) {
            t.Builder.forEach(b => {
                // Skip if already added
                if (!builderLookup[b]) {
builderLookup[b] = b;  // b is already the Builder record ID
                }
            });
        }
    });

    // Build list of actual display names
    const builderNames = [...new Set(Object.values(builderLookup))].sort();

  builderSelect.innerHTML =
    `<option value="">Select Builder</option>` +
    Object.keys(builderLookup).map(id => 
        `<option value="${id}">${builderLookup[id]}</option>`
    ).join("");

}

async function populatePlans(builder) {
    const all = await fetchAllTakeoffs();

    const plans = [...new Set(
        all
            .filter(t => (t.Builder || []).includes(builder))
            .map(t => t["Takeoff Name"])
    )].sort();

    planSelect.innerHTML =
        `<option value="">Select Plan</option>` +
        plans.map(p => `<option value="${p}">${p}</option>`).join("");
        maybeShowLineItems();   // 🔥 FORCE re-check

}
async function populateElevations(builder, plan) {
    const all = await fetchAllTakeoffs();

    const elevs = [...new Set(
        all
            .filter(t => (t.Builder || []).includes(builder) && t["Takeoff Name"] === plan)
            .map(t => t["Elevation"])
    )].sort();

    elevationSelect.innerHTML =
        `<option value="">Select Elevation</option>` +
        elevs.map(e => `<option value="${e}">${e}</option>`).join("");
        maybeShowLineItems();   // 🔥 FORCE re-check

}
async function populateCommunityDropdownByBuilderId(builderRecordId) {
    console.log("🏘 Loading communities for builder:", builderRecordId);

    const dropdown = document.getElementById("community-select");
    dropdown.innerHTML = `<option value="">Loading...</option>`;

    const list = await fetchCommunitiesByBuilderId(builderRecordId);

    dropdown.innerHTML = "";  

    if (list.length === 0) {
        dropdown.innerHTML = `<option value="">No communities found</option>`;
        return;
    }

    list.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.name;
        opt.textContent = c.name;
        dropdown.appendChild(opt);
    });

    console.log(`🏘 Loaded ${list.length} communities.`);
}

async function populateCommunities(builder, plan, elevation) {
    const all = await fetchAllTakeoffs();

    const comms = [...new Set(
        all
            .filter(t =>
                (t.Builder || []).includes(builder) &&
                t["Takeoff Name"] === plan &&
                t["Elevation"] === elevation
            )
            .map(t => t["Community Name"])
    )].sort();

    communitySelect.innerHTML =
        `<option value="">Select Community</option>` +
        comms.map(c => `<option value="${c}">${c}</option>`).join("");
        maybeShowLineItems();   // 🔥 FORCE re-check

}

async function fetchCommunitiesByBuilderId(builderRecordId) {
    if (!builderRecordId) {
        console.warn("⚠️ No builderRecordId provided to fetchCommunitiesByBuilderId()");
        return [];
    }

    console.log("🌐 Fetching communities for builder ID:", builderRecordId);

    const url = `https://api.airtable.com/v0/${BASE_ID}/${COMMUNITY_TABLE_ID}?filterByFormula=${encodeURIComponent(
        `FIND("${builderRecordId}", ARRAYJOIN({Builder}))`
    )}`;

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
        });

        const data = await res.json();

        if (!data.records) return [];

        return data.records.map(r => ({
            id: r.id,
            name: r.fields["Community Name"] || ""
        }));
    } catch (err) {
        console.error("❌ Error fetching communities:", err);
        return [];
    }
}

function maybeShowLineItems() {
  revealLineItemsSection(); // always show table, no conditions
}

  // ==========================================================
  // REVEAL TABLE SECTION
  // ==========================================================
function revealLineItemsSection() {

    document.getElementById("placeholder-box").style.display = "none";
    const section = document.getElementById("line-items-section");

    section.style.display = "block";
    section.style.opacity = 1;
}

  // ==========================================================
  // LOAD SKU CSV DATA
  // ==========================================================
 async function fetchSkuData() {

  const response = await fetch(TAKEOFF_SHEET_URL);
  const csvText = await response.text();

  const rows = csvText
    .trim()
    .split("\n")
    .map((r) =>
      r
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/) // smart split
        .map((x) => x.replace(/^"|"$/g, "").trim()) // remove surrounding quotes
    );

  // Remove header row
  const data = rows.slice(1);

  const parsed = data.map((r) => ({
    Vendor: r[0] || "",
    SKU: r[1] || "",
    UOM: r[2] || "",
    Description: r[3] || "",
    SKUHelper: r[4] || "",
    UOMMult: parseFloat(r[5]) || 1,
    Cost: parseFloat(r[6]) || 0,
  }));

  window.skuData = parsed;

}

  // ==========================================================
  // ADD BLANK LINE
  // ==========================================================
function addLineItem() {
    const row = document.createElement("tr");
    row.innerHTML = `
<td><input class="sku-input w-full" value=""></td>
<td><input class="desc-input w-full" value=""></td>
<td><input class="uom-input w-full" value=""></td>
<td><input class="mat-input w-full" value=""></td>
<td><input class="color-input w-full" value=""></td>
<td><input class="vendor-input w-full" value=""></td>
<td><input class="qty-input w-full" type="number" value="1"></td>
<td><input class="cost-input w-full" type="number" value=""></td>
<td><input class="mult-input w-full" type="number" value="1"></td>
<td><input class="extcost-input w-full" type="number" value="" readonly></td>
<td><input class="percent-input w-full" type="number" value="0"></td>
<td><input class="total-input w-full" type="number" value="" readonly></td>
<td class="text-center"><button class="remove-line text-red-500">🗑️</button></td>
    `;

    lineItemBody.appendChild(row);
enableVendorClickDropdown(row.querySelector(".vendor-input"));

    attachAutocomplete(row.querySelector(".sku-input"), "sku");
    attachCalculators(row);

    row.querySelector(".remove-line").addEventListener("click", () => row.remove());
    enableVendorClickDropdown(row.querySelector(".vendor-input"));

        updateGrandTotal();   

}


  if (addLineItemBtn) addLineItemBtn.addEventListener("click", addLineItem);

  // ==========================================================
  // AUTOCOMPLETE
  // ==========================================================
function attachAutocomplete(inputEl, mode) {
  if (!inputEl) return;

  let timeout;
  inputEl.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    if (q.length < 2) return hideSuggestionList();

    clearTimeout(timeout);
    timeout = setTimeout(() => searchSkuSuggestions(q, inputEl, mode), 180);
  });

  inputEl.addEventListener("blur", () => {
    setTimeout(() => hideSuggestionList(), 200);
  });
}

function searchSkuSuggestions(query, inputEl, mode) {
  let matches = [];
  const normalize = (s) => (s || "").trim().toLowerCase();


// ==========================
// Vendor Autocomplete Mode
// ==========================
if (mode === "vendor") {

    const row = inputEl.closest("tr");
    if (!row) return hideSuggestionList();

    const skuVal = row.querySelector(".sku-input")?.value?.trim() || "";
    if (!skuVal) return hideSuggestionList();

    // Filter ONLY vendors offering THIS EXACT SKU
    matches = window.skuData.filter(i =>
        normalize(i.SKU) === normalize(skuVal) &&
        normalize(i.Vendor).includes(normalize(query))
    );

    // Remove duplicates
    const seen = new Set();
    matches = matches.filter(i => {
        if (seen.has(i.Vendor)) return false;
        seen.add(i.Vendor);
        return true;
    });

    return showSuggestions(matches.slice(0, 10), inputEl, mode);
}

  // ==========================
  // SKU Autocomplete Mode
  // ==========================
  matches = window.skuData.filter(
    (i) =>
      normalize(i.SKU).includes(normalize(query)) ||
      normalize(i.Description).includes(normalize(query))
  );

  return showSuggestions(matches.slice(0, 10), inputEl, mode);
}

function fillVendorDetails(row, item) {
    if (!row || !item) return;

    // Preserve QTY before vendor overwrite triggers UI events
    const qtyInput = row.querySelector(".qty-input");
    const existingQty = qtyInput.value;

    row.querySelector(".vendor-input").value = item.Vendor || "";
    row.querySelector(".cost-input").value   = item.Cost || 0;
    row.querySelector(".mult-input").value   = item.UOMMult || 1;

    // Restore user's QTY
    qtyInput.value = existingQty;

    calculateRowTotals(row);
}

function calculateRowTotals(row) {
    if (!row) return;

const rawQty = row.querySelector(".qty-input").value;
const qty = rawQty === "" ? "" : Number(rawQty);
    const cost = parseFloat(row.querySelector(".cost-input")?.value || 0);
    const mult = parseFloat(row.querySelector(".mult-input")?.value || 1);
    const margin = parseFloat(row.querySelector(".percent-input")?.value || 0);

    const extCost = qty * cost * mult;
    const total = extCost * (1 + margin / 100);

    const extCostInput = row.querySelector(".extcost-input");
    const totalInput = row.querySelector(".total-input");

    if (extCostInput) extCostInput.value = extCost.toFixed(2);
    if (totalInput) totalInput.value = total.toFixed(2);

}

function hideSuggestionList() {
    document.querySelectorAll("#autocomplete-list").forEach(el => el.remove());
}

function fillRowFromSku(row, item) {
    row.querySelector(".desc-input").value = item.Description || "";
    row.querySelector(".uom-input").value = item.UOM || "";
    row.querySelector(".mat-input").value = item.MaterialType || "";
    row.querySelector(".color-input").value = item.ColorGroup || "";
    row.querySelector(".vendor-input").value = item.Vendor || "";
    row.querySelector(".cost-input").value = item.Cost || 0;
    row.querySelector(".mult-input").value = item.UOMMult || 1;

    calculateRowTotals(row);
}

function fillVendorDetails(row, item) {
    if (!row || !item) return;

    row.querySelector(".vendor-input").value = item.Vendor || "";
    row.querySelector(".cost-input").value   = item.Cost || 0;
    row.querySelector(".mult-input").value   = item.UOMMult || 1;

    calculateRowTotals(row);
}

function enableVendorClickDropdown(inputEl) {
    inputEl.addEventListener("focus", () => {
        showVendorDropdown(inputEl);
    });

    inputEl.addEventListener("click", () => {
        showVendorDropdown(inputEl);
    });

}

function showVendorDropdown(inputEl) {

    hideSuggestionList();

    const row = inputEl.closest("tr");
    const skuVal = row.querySelector(".sku-input")?.value?.trim() || "";


    if (!skuVal) {
        return;
    }

    let matches = window.skuData.filter(i =>
        i.SKU.toLowerCase() === skuVal.toLowerCase()
    );

    const seen = new Set();
    matches = matches.filter(i => {
        if (seen.has(i.Vendor)) return false;
        seen.add(i.Vendor);
        return true;
    });

    showSuggestions(matches, inputEl, "vendor");
}

function showSuggestions(results, inputEl, mode = "sku") {
    // Remove existing dropdown
    hideSuggestionList();

    if (!results || results.length === 0) return;

    // Create dropdown element
    const list = document.createElement("ul");
    list.id = "autocomplete-list";
    list.style.position = "absolute";
    list.style.background = "white";
    list.style.border = "1px solid #ccc";
    list.style.zIndex = "9999";
    list.style.maxHeight = "250px";
    list.style.overflowY = "auto";
    list.style.width = inputEl.offsetWidth + "px";
    list.style.left = inputEl.getBoundingClientRect().left + window.scrollX + "px";
    list.style.top = inputEl.getBoundingClientRect().bottom + window.scrollY + "px";
    list.className = "autocomplete-container";

    // Build suggestion items
    results.forEach((item) => {
        const li = document.createElement("li");
        li.className = "autocomplete-item hover:bg-gray-200 px-2 py-1 cursor-pointer";

        // Display text in dropdown
        if (mode === "sku") {
            li.textContent = `${item.SKU} — ${item.Description}`;
        } else if (mode === "vendor") {
            li.textContent = item.Vendor;  // Only show vendor name
        }

        // CLICK HANDLER
        li.addEventListener("click", () => {
            const row = inputEl.closest("tr"); // ✅ row safely defined here

            if (mode === "sku") {
                // Fill SKU
                inputEl.value = item.SKU;
                fillRowFromSku(row, item);

            } else if (mode === "vendor") {
                // Fill Vendor
                inputEl.value = item.Vendor;
                fillVendorDetails(row, item);
            }

            // Recalculate totals
            calculateRowTotals(row);

            // Hide dropdown
            hideSuggestionList();
        });

        list.appendChild(li);
    });

    document.body.appendChild(list);
}

// ==========================================================
  // CALCULATOR
  // ==========================================================
function attachCalculators(row) {
    const qty = row.querySelector(".qty-input");
    const cost = row.querySelector(".cost-input");
    const mult = row.querySelector(".mult-input");
    const ext = row.querySelector(".extcost-input");
    const margin = row.querySelector(".percent-input");
    const total = row.querySelector(".total-input");

    if (!qty || !cost || !mult || !ext || !margin || !total) {
        console.warn("⚠️ Calculator skipped — missing inputs:", row);
        return;
    }

    function recalc() {
const q = qty.value === "" ? 0 : parseFloat(qty.value);
        const c = parseFloat(cost.value) || 0;
        const m = parseFloat(mult.value) || 1;
        const p = parseFloat(margin.value) || 0;

        const extCost = q * c * m;
        const totalCost = extCost * (1 + p / 100);

        ext.value = extCost.toFixed(2);
        total.value = totalCost.toFixed(2);
        updateGrandTotal();  // <-- 🔥 IMPORTANT
    }

    qty.addEventListener("input", recalc);
    cost.addEventListener("input", recalc);
    mult.addEventListener("input", recalc);
    margin.addEventListener("input", recalc);

    recalc();
}

function updateGrandTotal() {
    const totalInputs = document.querySelectorAll(".total-input");
    let sum = 0;

    totalInputs.forEach(i => {
        const v = parseFloat(i.value);
        if (!isNaN(v)) sum += v;
    });

    document.getElementById("grand-total").value = sum.toFixed(2);

}

  // ==========================================================
  // EDIT MODE → LOAD TAKEOFF
  // ==========================================================
async function loadExistingTakeoff(recordId) {
    console.log("📥 Loading takeoff:", recordId);

    const res = await fetch(
        `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}/${recordId}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` } }
    );

    const data = await res.json();
    const f = data.fields;

    // ------------- Fill Header Fields -------------
    document.getElementById("nameInput").value = f["Takeoff Name"] || "";
    document.getElementById("takeoff-type").value = f["Type"] || "";
    document.getElementById("builder-select").value = f["Builder"] || "";
    document.getElementById("plan-select").value = f["Plan"] || "";
    document.getElementById("elevation-select").value = f["Elevation"] || "";
    document.getElementById("community-select").value = f["Community"] || "";

    revealLineItemsSection();

    // ------------- Load JSON Into Table -------------
    const rawJson = f["Imported JSON"] || "[]";
    let parsed = [];

    try {
        parsed = JSON.parse(rawJson);
    } catch (err) {
        console.error("❌ Invalid JSON:", err, rawJson);
        parsed = [];
    }

    loadJsonIntoTable(parsed);
}

function loadJsonIntoTable(rows) {
    const tbody = document.getElementById("line-item-body");
    tbody.innerHTML = ""; // clear old rows

    rows.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input class="sku-input w-full" value="${item.SKU || ""}"></td>
            <td><input class="desc-input w-full" value="${item.Description || ""}"></td>
            <td><input class="uom-input w-full" value="${item.UOM || ""}"></td>
            <td><input class="mat-input w-full" value="${item.MaterialType || ""}"></td>
            <td><input class="color-input w-full" value="${item.ColorGroup || ""}"></td>
            <td><input class="vendor-input w-full" value="${item.Vendor || ""}"></td>
            <td><input class="qty-input w-full" type="number" value="${item.QTY || 0}"></td>
            <td><input class="cost-input w-full" type="number" value="${item.Cost || 0}"></td>
            <td><input class="mult-input w-full" type="number" value="${item.UOMMult || 1}"></td>
            <td><input class="extcost-input w-full" type="number" readonly></td>
            <td><input class="percent-input w-full" type="number" value="${item.Margin || 0}"></td>
            <td><input class="total-input w-full" type="number" readonly></td>
            <td><button class="remove-line text-red-500">🗑️</button></td>
        `;

        tr.querySelector(".remove-line").addEventListener("click", () => tr.remove());

        attachAutocomplete(tr.querySelector(".sku-input"), "sku");
        enableVendorClickDropdown(tr.querySelector(".vendor-input"));
        attachCalculators(tr);

        tbody.appendChild(tr);

        calculateRowTotals(tr);
    });

    updateGrandTotal();
}

});

function getItemsForSave() {
    const rows = [...document.querySelectorAll("#line-item-body tr")];

    const items = rows.map(row => normalizeRow({
        SKU: row.querySelector(".sku-input").value,
        Description: row.querySelector(".desc-input").value,
        UOM: row.querySelector(".uom-input").value,
        "Material Type": row.querySelector(".mat-input").value,
        "Color Group": row.querySelector(".color-input").value,
        Vendor: row.querySelector(".vendor-input").value,
        QTY: Number(row.querySelector(".qty-input").value || 0),
        "Unit Cost": Number(row.querySelector(".cost-input").value || 0),
        "UOM Mult": Number(row.querySelector(".mult-input").value || 1),
        "Ext. Cost": Number(row.querySelector(".extcost-input").value || 0),
        "%": Number(row.querySelector(".percent-input").value || 0),
        Total: Number(row.querySelector(".total-input").value || 0),
    }));

    return items;
}

async function getNextRevision(takeoffName) {
    const url = `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}?filterByFormula=${encodeURIComponent(
        `{Takeoff Name} = "${takeoffName}"`
    )}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
    });

    const json = await res.json();

    if (!json.records.length) return 1;

    let maxRev = 0;

    json.records.forEach(r => {
        const rev = Number(r.fields["Revision #"] || 0);
        if (rev > maxRev) maxRev = rev;
    });

    return maxRev + 1;
}



function collectAllSkuRows() {
  const rows = document.querySelectorAll("#line-item-body tr");
  const items = [];

  rows.forEach(row => {
    items.push({
      SKU: row.querySelector(".sku-input")?.value || "",
      Description: row.querySelector(".desc-input")?.value || "",
      UOM: row.querySelector(".uom-input")?.value || "",
      "Material Type": row.querySelector(".mat-input")?.value || "",
      "Color Group": row.querySelector(".color-input")?.value || "",
      Vendor: row.querySelector(".vendor-input")?.value || "",
      Qty: Number(row.querySelector(".qty-input")?.value || 0),
      "Unit Cost": Number(row.querySelector(".cost-input")?.value || 0),
      "UOM Mult": Number(row.querySelector(".mult-input")?.value || 1),
      "Ext. Cost": Number(row.querySelector(".extcost-input")?.value || 0),
      "%": Number(row.querySelector(".percent-input")?.value || 0),
      Total: Number(row.querySelector(".total-input")?.value || 0)
    });
  });

  return items;
}


async function patchLiftOffChanges(recordId, changes) {
    try {
        const url = `https://vanirlive.lbmlo.live/f5api/updateTakeoff`;
        
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": "bP1HdvmaE9mYEtjDeYYA737bypiNX5ZM"
            },
            body: JSON.stringify({
                recordId: recordId,
                changes: changes
            })
        });

        const data = await res.json();
        console.log("📤 LiftOff PATCH response:", data);
    } 
    catch (err) {
        console.error("❌ LiftOff PATCH failed:", err);
    }
}

// ==========================================================
// FINAL SAVE TAKEOFF (Correct Qty + JSON + Header)
// ==========================================================

function attachRowListeners(row) {
    const qtyInput = row.querySelector(".qty-input");
    const vendorInput = row.querySelector(".vendor-input");

    // Initialize originals if missing
    if (!row.dataset.originalQty) row.dataset.originalQty = qtyInput.value;
    if (!row.dataset.originalVendor) row.dataset.originalVendor = vendorInput.value;

    // When user changes QTY
    qtyInput.addEventListener("input", () => {
        console.log("✏️ Qty edited", qtyInput.value);
    });

    // When user changes Vendor
    vendorInput.addEventListener("input", () => {
        console.log("✏️ Vendor edited", vendorInput.value);
    });
}
async function loadEstimatorsDropdown() {
    const url = `https://api.airtable.com/v0/${BASE_ID2}/tbl1ymzV1CYldIGJU?fields[]=Full%20Name&pageSize=100`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
    });

    const data = await res.json();
    const dropdown = document.getElementById("estimator-select");

    // Reset dropdown
    dropdown.innerHTML = `<option value="">-- Select Estimator --</option>`;

    data.records.forEach(rec => {
        const opt = document.createElement("option");
        opt.value = rec.id;   // linked record ID
        opt.textContent = rec.fields["Full Name"];
        dropdown.appendChild(opt);
    });

    console.log(`📌 Loaded ${data.records.length} estimators`);
}

async function loadEstimators() {
    const url = `https://api.airtable.com/v0/${BASE_ID2}/tbl1ymzV1CYldIGJU?fields[]=Full%20Name`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
    });

    const json = await res.json();

    const estDrop = document.getElementById("estimator-select");
    estDrop.innerHTML = `<option value="">Select Estimator</option>`;

    json.records.forEach(rec => {
        const opt = document.createElement("option");
        opt.value = rec.id;                       // IMPORTANT: record ID!
        opt.textContent = rec.fields["Full Name"];
        estDrop.appendChild(opt);
    });
}

// -----------------------------------------------------------
// ⭐ FINAL FULL SAVE FUNCTION (Qty/Vendor patch + Revision #)
// -----------------------------------------------------------

function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) {
        console.warn("⚠️ Toast element not found!");
        return;
    }

    t.textContent = msg;
    t.style.opacity = 1;

    setTimeout(() => {
        t.style.opacity = 0;
    }, 2200);
}
// ------------------------------------------------------
// CHECK IF Takeoff Name ALREADY EXISTS IN AIRTABLE
// ------------------------------------------------------
async function doesPlanAlreadyExist(takeoffName) {
    if (!takeoffName) return false;

    const url = `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}?filterByFormula=${encodeURIComponent(
        `{Takeoff Name} = "${takeoffName}"`
    )}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
    });

    const data = await res.json();

    return data.records && data.records.length > 0;
}

async function doesTakeoffAlreadyExist(takeoffName) {
    if (!takeoffName) return false;

    const formula = `{Takeoff Name} = "${takeoffName}"`;

    const url = `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}?filterByFormula=${encodeURIComponent(formula)}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
    });

    const data = await res.json();

    return data.records && data.records.length > 0;
}
async function saveTakeoff() {
    console.log("💾 Saving Takeoff…");

    // --------------------------------------------
    // load takeoff id / edit state
    // --------------------------------------------
    let recordId = localStorage.getItem("editingTakeoffId");
    let isEdit = Boolean(recordId);

    // --------------------------------------------
    // declare these ONCE at top
    // --------------------------------------------
    const name = document.getElementById("nameInput")?.value.trim() || "";
const takeoffName = document.getElementById("nameInput")?.value.trim() || "";

    // --------------------------------------------
    // prevent overwrite — check Takeoff Name
    // --------------------------------------------
// 🔥 Prevent overwrite — check Takeoff Name ONLY
if (await doesTakeoffAlreadyExist(takeoffName)) {
    isEdit = false;
    recordId = null;
    localStorage.removeItem("editingTakeoffId");
}



    // 1. Selected estimator (record ID) from dropdown
    const selectedEstimatorId =
        document.getElementById("estimator-select")?.value || "";

    // 2. Typed override name
    const typedEstimatorName =
        document.getElementById("estimator-name-input")?.value.trim() || "";

    // 3. Declare once (fixes your reference error)
    let estimatorId = "";

    // 4. If dropdown chosen -> use record ID
    if (selectedEstimatorId) {
        estimatorId = selectedEstimatorId;

    // 5. If user typed a name -> look up record ID
    } else if (typedEstimatorName) {
        estimatorId = await getEstimatorRecordIdByName(typedEstimatorName);
    }

    console.log("🧾 Final Estimator ID:", estimatorId);

     // ------------------------------
    // Build JSON
    // ------------------------------
    let updatedJson = [];


    document.querySelectorAll("#line-item-body tr").forEach(row => {
        updatedJson.push({
            SKU: row.querySelector(".sku-input")?.value || "",
            Description: row.querySelector(".desc-input")?.value || "",
            UOM: row.querySelector(".uom-input")?.value || "",
            Qty: Number(row.querySelector(".qty-input")?.value || 0),
            ColorGroup: row.querySelector(".color-input")?.value || "",
            Vendor: row.querySelector(".vendor-input")?.value || "",
            UnitCost: Number(row.querySelector(".cost-input")?.value || 0),
            Mult: Number(row.querySelector(".mult-input")?.value || 1)
        });
    });

    console.log("🧪 JSON before save:", updatedJson);

  
  // Compute correct next revision number
const revision = await getNextRevision(takeoffName);
console.log("🔢 Next Revision:", revision);


    // ------------------------------
    // Fields to save
    // ------------------------------
    const fields = {
        "Takeoff Name": name,
        "Imported JSON": JSON.stringify(updatedJson),
        "Revision #": revision,
        "Estimator": estimatorId ? [estimatorId] : []
    };

    console.log("📤 Fields to save:", fields);

    // ------------------------------
    // POST or PATCH
    // ------------------------------
    const url = isEdit
        ? `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}/${recordId}`
        : `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}`;

    const method = isEdit ? "PATCH" : "POST";

    try {
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY2}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ fields })
        });

        const data = await res.json();

        console.log("📥 Airtable save response:", data);

        if (!res.ok) {
            console.error("❌ Save failed:", data);
            alert("Save failed. See console.");
            return;
        }

        if (!isEdit && data.id) {
            localStorage.setItem("editingTakeoffId", data.id);
        }

        alert("Takeoff saved successfully!");

    } catch (err) {
        console.error("❌ Save error:", err);
        alert("Save error. See console.");
    }
}

