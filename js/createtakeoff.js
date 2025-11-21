import { logActivity } from "./activity-logger.js";


// Google Sheet CSV for SKU master data
const TAKEOFF_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv";


// Airtable configs
const AIRTABLE_API_KEY2 =
  "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID2 = "appnZNCcUAJCjGp7L";
const TAKEOFFS_TABLE_ID2 = "tblZpnyqHJeC1IaZq";
let estimatorLookup = {};
let estimatorList = [];

const ESTIMATOR_TABLE_ID = "tbl1ymzV1CYldIGJU";
window.skuData = [];
let builderLookup = {};  
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("manual-save-btn");
    if (saveBtn) saveBtn.addEventListener("click", saveTakeoff);
});
document.getElementById("grand-total").value

// ==========================================================
// MAIN APP INITIALIZATION
// ==========================================================
document.addEventListener("DOMContentLoaded", async () => {
    await loadEstimators(); 

  // DOM elements
const builderSelect = document.getElementById("builder-select");
const planSelect = document.getElementById("plan-select");
const elevationSelect = document.getElementById("elevation-select");
const communitySelect = document.getElementById("community-select");

  const lineItemBody = document.getElementById("line-item-body");
  const addLineItemBtn = document.getElementById("add-line-item");

  // MODE FLAGS
  let editingId = localStorage.getItem("editingTakeoffId");
  let isLoadingEditMode = false;
// Load builders immediately
populateBuilders();

// When Elevation selected → Load Communities
elevationSelect.addEventListener("change", () => {
populateCommunities(builderSelect.value, elevationSelect.value);
});

  await fetchSkuData();

 if (editingId) {
    isLoadingEditMode = true;
    setTimeout(() => loadExistingTakeoff(editingId), 900);
}

async function loadEstimators() {
    let offset = null;
    let all = [];

    do {
        const url = `https://api.airtable.com/v0/${BASE_ID2}/${ESTIMATOR_TABLE_ID}?pageSize=100${offset ? "&offset="+offset : ""}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` }
        });

        const data = await res.json();
        all = all.concat(data.records);
        offset = data.offset;

    } while (offset);

    estimatorList = all;

    estimatorList.forEach(r => {
        const fullName = r.fields["Full Name"] || "Unnamed";
        estimatorLookup[r.id] = fullName;
    });

    populateEstimatorDropdown();
}

function populateEstimatorDropdown() {
    const select = document.getElementById("estimator-select");
    select.innerHTML = `<option value="">-- Select Estimator --</option>`;

    estimatorList.forEach(r => {
        const fullName = r.fields["Full Name"];
        select.innerHTML += `<option value="${r.id}">${fullName}</option>`;
    });
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
    const url = `https://api.airtable.com/v0/${BASE_ID2}/tblDkASnuImCKBQyO?pageSize=100`;
    
    let builders = [];
    let offset = null;

    // Fetch ALL builders with pagination
    do {
        const res = await fetch(
            `${url}${offset ? "&offset=" + offset : ""}`,
            { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` } }
        );
        const data = await res.json();
        builders = builders.concat(data.records);
        offset = data.offset;
    } while (offset);

    // Reset lookup
    builderLookup = {};

    // Build lookup: recordId → Client Name
    builders.forEach(b => {
        const name = b.fields["Client Name"] || "Unnamed Builder";
        builderLookup[b.id] = name;
    });

    // Populate dropdown
    builderSelect.innerHTML =
        `<option value="">Select Builder</option>` +
        Object.keys(builderLookup)
            .map(id => `<option value="${id}">${builderLookup[id]}</option>`)
            .join("");
}

builderSelect.addEventListener("change", async e => {
    await populateElevations(e.target.value);
});

async function populateElevations(builder) {
    const all = await fetchAllTakeoffs();

    const elevs = [...new Set(
        all
            .filter(t => (t.Builder || []).includes(builder))
            .map(t => t["Elevation"])
    )].sort();

    elevationSelect.innerHTML =
        `<option value="">Select Elevation</option>` +
        elevs.map(e => `<option value="${e}">${e}</option>`).join("");
}

async function populateCommunities(builder, elevation) {
    const all = await fetchAllTakeoffs();

    const comms = [...new Set(
        all
            .filter(t =>
                (t.Builder || []).includes(builder) &&
                t["Elevation"] === elevation
            )
            .map(t => t["Community Name"])
    )].sort();

    communitySelect.innerHTML =
        `<option value="">Select Community</option>` +
        comms.map(c => `<option value="${c}">${c}</option>`).join("");
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
<td><input class="cost-input w-full" type="number" value="0"></td>
<td><input class="mult-input w-full" type="number" value="1"></td>
<td><input class="extcost-input w-full" type="number" value="0" readonly></td>
<td><input class="percent-input w-full" type="number" value="0"></td>
<td><input class="total-input w-full" type="number" value="0" readonly></td>
<td class="text-center"><button class="remove-line text-red-500">🗑️</button></td>
    `;

    document.getElementById("line-item-body").appendChild(row);

    attachAutocomplete(row.querySelector(".sku-input"), "sku");
    enableVendorClickDropdown(row.querySelector(".vendor-input"));
    attachCalculators(row);

    row.querySelector(".remove-line").addEventListener("click", () => {
        row.remove();
        updateGrandTotal();
    });

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

    const res = await fetch(
        `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}/${recordId}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` } }
    );

    const data = await res.json();
    const f = data.fields;

    // Guard
    if (!f) {
        console.error("❌ No fields returned for this record:", data);
        return;
    }

    document.getElementById("nameInput").value =
        f["Takeoff Name"] || "";

    // ⭐ Single Select → Takeoff Type
    document.getElementById("takeoff-type").value =
        f["Type"] || "";

    if (Array.isArray(f["Builder"]) && f["Builder"].length > 0) {
        document.getElementById("builder-select").value = f["Builder"][0];
    } else {
        console.warn("⚠️ No Builder linked");
    }

    if (f["Plan"]) {
        document.getElementById("plan-select").value = f["Plan"];
    }

    if (f["Elevation"]) {
        document.getElementById("elevation-select").value = f["Elevation"];
    }

    if (Array.isArray(f["Community"]) && f["Community"].length > 0) {
if (Array.isArray(f["Community2"]) && f["Community2"].length > 0) {
    communitySelect.value = f["Community2"][0];  // record ID
}
    } else {
        console.warn("⚠️ No Community linked");
    }

    const estSelect = document.getElementById("estimator-select");

    if (Array.isArray(f["Estimator"]) && f["Estimator"].length > 0) {
        estSelect.value = f["Estimator"][0];
        console.log("📌 Loaded Estimator:", f["Estimator"][0]);
    } else {
        console.log("⚠️ No Estimator found on record");
    }

    let parsed = [];
    const rawJson = f["Imported JSON"] || "[]";

    try {
        parsed = JSON.parse(rawJson);
    } catch (err) {
        console.error("❌ JSON parse failed:", err, rawJson);
        parsed = [];
    }

    loadJsonIntoTable(parsed);
}

function loadJsonIntoTable(rows) {
    const tbody = document.getElementById("line-item-body");
    tbody.innerHTML = ""; 

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
            <td><input class="cost-input w-full" type="number" value="${item["Unit Cost"] || 0}"></td>
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
  
// Pull dropdown fields again for saving
const builderSelect = document.getElementById("builder-select");
const elevationSelect = document.getElementById("elevation-select");
const communitySelect = document.getElementById("community-select");

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
    const builder = document.getElementById("builder-select")?.value || "";
    const estimatorSelect = document.getElementById("estimator-select");
    let estimatorId = estimatorSelect.value;
    const takeoffType = document.getElementById("takeoff-type")?.value || "";
    const finalEstimator = estimatorId ? [estimatorId] : [];

    // --------------------------------------------
    // prevent overwrite — check Takeoff Name
    // --------------------------------------------
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

    // 4. If dropdown chosen -> use record ID
    if (selectedEstimatorId) {
        estimatorId = selectedEstimatorId;

    // 5. If user typed a name -> look up record ID
    } else if (typedEstimatorName) {
        estimatorId = await getEstimatorRecordIdByName(typedEstimatorName);
    }

     // ------------------------------
    // Build JSON
    // ------------------------------
    let updatedJson = [];


    document.querySelectorAll("#line-item-body tr").forEach(row => {
    updatedJson.push({
    SKU: row.querySelector(".sku-input")?.value || "",
    Description: row.querySelector(".desc-input")?.value || "",
    UOM: row.querySelector(".uom-input")?.value || "",

    // 🔥 MATCH WHAT THE LOADER EXPECTS
    QTY: Number(row.querySelector(".qty-input")?.value || 0),
    "Unit Cost": Number(row.querySelector(".cost-input")?.value || 0),
    UOMMult: Number(row.querySelector(".mult-input")?.value || 1),

    // 🔥 MATCHES YOUR LOADER EXACTLY
    "Total Cost": Number(row.querySelector(".extcost-input")?.value || 0),
    "Total Quoted Price:": Number(row.querySelector(".total-input")?.value || 0),

    // Optional
    "Material Type": row.querySelector(".mat-input")?.value || "",
    "Color Group": row.querySelector(".color-input")?.value || "",
    Vendor: row.querySelector(".vendor-input")?.value || "",
    Margin: Number(row.querySelector(".percent-input")?.value || 0)
});

    });

  // Compute correct next revision number
const revision = await getNextRevision(takeoffName);

    // ------------------------------
    // Fields to save
    // ------------------------------
const fields = {
    "Takeoff Name": name,
    "Imported JSON": JSON.stringify(updatedJson),
    "Revision #": revision,
    "Estimator": finalEstimator,
    "Type": takeoffType || null,
    "Builder": builderSelect.value ? [builderSelect.value] : [],

    // ⭐ NEW — BOTH FIELDS
    "Community": communitySelect.options[communitySelect.selectedIndex].text || "",
    "Community2": communitySelect.value ? [communitySelect.value] : [],

    "Elevations": elevationSelect.value || "",
    "Material cost": Number(document.getElementById("grand-total")?.value || 0),
};



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

       if (!res.ok) {
    console.error("❌ Save failed:", data);
    alert("Save failed. See console.");
    return;
}

if (!isEdit && data.id) {
    localStorage.setItem("editingTakeoffId", data.id);
}

// ------------------------------------------------------
// 🔥 NEW — Log the Create/Update Activity
// ------------------------------------------------------

const builderName =
  builderLookup[builderSelect.value] || "Unknown Builder";

logActivity("Takeoff Create", {
  takeoffName,
  builder: builderName,
  revision
});



// ------------------------------------------------------
alert("Takeoff saved successfully!");

    } catch (err) {
        console.error("❌ Save error:", err);
        alert("Save error. See console.");
    }
}

