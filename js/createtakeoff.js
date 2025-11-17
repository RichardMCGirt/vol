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
const SKU_TABLE_ID2 = "tblcG08fWPOesXDfC"; // JSON table

window.skuData = [];
let builderLookup = {};  

// ==========================================================
// MAIN APP INITIALIZATION
// ==========================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🎬 Takeoff Creation Page Ready");

  // DOM elements
  const nameInput = document.querySelector(
    'input[placeholder="E.g., Spanish Style"]'
  );
  const typeSelect = document.getElementById("takeoff-type");
  const builderSelect = document.getElementById("builder-select");
  const planSelect = document.getElementById("plan-select");
  const elevationSelect = document.getElementById("elevation-select");
  const communitySelect = document.getElementById("community-select");

  const placeholderBox = document.getElementById("placeholder-box");
  const lineItemsSection = document.getElementById("line-items-section");
  const lineItemBody = document.getElementById("line-item-body");
  const addLineItemBtn = document.getElementById("add-line-item");

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
                    // b is the record ID, t["Builder Name"] is unknown so we use Plan records
                    builderLookup[b] = t["Builder Name"] || b;
                }
            });
        }
    });

    // Build list of actual display names
    const builderNames = [...new Set(Object.values(builderLookup))].sort();

    builderSelect.innerHTML =
        `<option value="">Select Builder</option>` +
        builderNames.map(b => `<option value="${b}">${b}</option>`).join("");
}

async function populatePlans(builder) {
    const all = await fetchAllTakeoffs();

    const plans = [...new Set(
        all
            .filter(t => (t.Builder || []).includes(builder))
            .map(t => t["Plan name"])
    )].sort();

    planSelect.innerHTML =
        `<option value="">Select Plan</option>` +
        plans.map(p => `<option value="${p}">${p}</option>`).join("");
}
async function populateElevations(builder, plan) {
    const all = await fetchAllTakeoffs();

    const elevs = [...new Set(
        all
            .filter(t => (t.Builder || []).includes(builder) && t["Plan name"] === plan)
            .map(t => t["Elevation"])
    )].sort();

    elevationSelect.innerHTML =
        `<option value="">Select Elevation</option>` +
        elevs.map(e => `<option value="${e}">${e}</option>`).join("");
}
async function populateCommunities(builder, plan, elevation) {
    const all = await fetchAllTakeoffs();

    const comms = [...new Set(
        all
            .filter(t =>
                (t.Builder || []).includes(builder) &&
                t["Plan name"] === plan &&
                t["Elevation"] === elevation
            )
            .map(t => t["Community Name"])
    )].sort();

    communitySelect.innerHTML =
        `<option value="">Select Community</option>` +
        comms.map(c => `<option value="${c}">${c}</option>`).join("");
}

  // ==========================================================
  // LOGIC TO SHOW TABLE AFTER HEADERS FILLED (CREATE MODE)
  // ==========================================================
  function allFieldsFilled() {
    return (
      nameInput.value.trim() &&
      typeSelect.value &&
      builderSelect.value &&
      planSelect.value &&
      elevationSelect.value &&
      communitySelect.value
    );
  }

  function maybeShowLineItems() {
    if (isLoadingEditMode) return; // prevent flicker during edit load
    if (allFieldsFilled()) revealLineItemsSection();
  }

  [
    nameInput,
    typeSelect,
    builderSelect,
    planSelect,
    elevationSelect,
    communitySelect,
  ]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("change", maybeShowLineItems);
      el.addEventListener("input", maybeShowLineItems);
    });

  // ==========================================================
  // REVEAL TABLE SECTION
  // ==========================================================
  function revealLineItemsSection() {
    placeholderBox.classList.add("hidden");
    lineItemsSection.classList.remove("hidden");
    lineItemsSection.style.opacity = "1";

    // CREATE MODE → LOAD CSV SKUs
    if (!editingId) {
      console.log("📌 CREATE MODE → Loading SKUs into table...");
      lineItemBody.innerHTML = "";
      window.skuData.forEach((skuObj) => addLineItemFromSku(skuObj));
    }
  }

  // ==========================================================
  // LOAD SKU CSV DATA
  // ==========================================================
 async function fetchSkuData() {
  console.log("📡 Fetching SKU CSV…");

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

  console.log("📦 Parsed first 5 rows:", window.skuData.slice(0, 5));
}


  // ==========================================================
  // ADD LINE ITEM FROM SKU CSV
  // ==========================================================
  function addLineItemFromSku(skuObj) {
    const row = document.createElement("tr");
row.innerHTML = `
<td><input class="sku-input w-full"></td>
<td><input class="desc-input w-full"></td>
<td><input class="uom-input w-full"></td>

<td><input class="mat-input w-full"></td>
<td><input class="color-input w-full"></td>
<td><input class="vendor-input w-full"></td>

<td><input class="qty-input w-full" type="number" value="1"></td>


<td><input class="cost-input w-full" type="number"></td>
<td><input class="mult-input w-full" type="number" value="1"></td>

<td><input class="extcost-input w-full" type="number" readonly></td>

<td><input class="percent-input w-full" type="number" value="0"></td>

<td><input class="total-input w-full" type="number" readonly></td>

<td class="text-center">
    <button class="remove-line text-red-500">🗑️</button>
</td>
`;

console.log(row.outerHTML);
console.log("DEBUG ROW:", row.outerHTML);


    lineItemBody.appendChild(row);
    enableVendorClickDropdown(row.querySelector(".vendor-input"));

attachAutocomplete(row.querySelector(".sku-input"), "sku");
    attachCalculators(row);

    row.querySelector(".remove-line").addEventListener("click", () => row.remove());
    enableVendorClickDropdown(row.querySelector(".vendor-input"));

        updateGrandTotal();   // <-- add this!

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

        updateGrandTotal();   // <-- add this!

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

    console.log("📦 fillVendorDetails:", item);

    // Update pricing for that vendor
    row.querySelector(".cost-input").value = item.Cost || 0;

    // Same SKU, so UOM should match
    row.querySelector(".uom-input").value = item.UOM || "";
    row.querySelector(".desc-input").value = item.Description || "";
}

function calculateRowTotals(row) {
    if (!row) return;

    const qty = parseFloat(row.querySelector(".qty-input")?.value || 0);
    const cost = parseFloat(row.querySelector(".cost-input")?.value || 0);
    const mult = parseFloat(row.querySelector(".mult-input")?.value || 1);
    const margin = parseFloat(row.querySelector(".percent-input")?.value || 0);

    const extCost = qty * cost * mult;
    const total = extCost * (1 + margin / 100);

    const extCostInput = row.querySelector(".extcost-input");
    const totalInput = row.querySelector(".total-input");

    if (extCostInput) extCostInput.value = extCost.toFixed(2);
    if (totalInput) totalInput.value = total.toFixed(2);

    console.log("🧮 Row recalculated:", { qty, cost, mult, margin, extCost, total });
}

function hideSuggestionList() {
    document.querySelectorAll("#autocomplete-list").forEach(el => el.remove());
}


function fillRowFromSku(row, item) {
    if (!row || !item) {
        console.warn("❗ fillRowFromSku called without row or item:", { row, item });
        return;
    }

    const map = {
        ".desc-input": item.Description || "",
        ".uom-input": item.UOM || "",

        // Support both field styles
        ".mat-input": item.MaterialType || item["Material Type"] || "",
        ".color-input": item.ColorGroup || item["Color Group"] || "",

        ".vendor-input": item.Vendor || "",
        ".cost-input": item.Cost || 0,
        ".mult-input": item.UOMMult || 1
    };

    Object.entries(map).forEach(([selector, value]) => {
        const input = row.querySelector(selector);
        if (!input) {
            console.warn(`⚠️ Missing input for selector: ${selector}`);
            console.warn("Row HTML:", row.outerHTML);
            return;
        }
        input.value = value;
    });

    // Recalculate totals now that fields are filled
    calculateRowTotals(row);
}



function fillVendorDetails(row, item) {
    if (!row || !item) return;

    row.querySelector(".vendor-input").value = item.Vendor || "";
    row.querySelector(".cost-input").value   = item.Cost || 0;
    row.querySelector(".mult-input").value   = item.UOMMult || 1;

    calculateRowTotals(row);
}


async function saveTakeoff() {
    console.log("💾 Saving takeoff...");

    const rows = [...document.querySelectorAll("#line-item-body tr")];

    const items = rows.map(row => ({
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
    }));

    console.log("📦 JSON being saved:", items);

    const jsonString = JSON.stringify(items);

    // --- YOU MUST ALREADY KNOW THE RECORD ID ---
    const recordId = window.currentTakeoffRecordId;
    if (!recordId) {
        alert("❌ No record ID found to save to Airtable!");
        return;
    }

    const url = `https://api.airtable.com/v0/${BASE_ID2}/${SKU_TABLE_ID2}/${recordId}`;

    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${AIRTABLE_API_KEY2}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            fields: {
                "Imported JSON": jsonString
            }
        })
    });

    if (!res.ok) {
        console.error("❌ Airtable Save Error:", await res.text());
        alert("Failed to save!");
        return;
    }

    console.log("✅ Saved successfully!");
    showToast("Takeoff saved successfully!");
}
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.opacity = "0";
    }, 2000);
}
function enableVendorClickDropdown(inputEl) {
    inputEl.addEventListener("focus", () => {
        console.log("🔥 Vendor field focused", inputEl);
        showVendorDropdown(inputEl);
    });

    inputEl.addEventListener("click", () => {
        console.log("🔥 Vendor field clicked", inputEl);
        showVendorDropdown(inputEl);
    });
    console.log("✔ Vendor click handler attached:", inputEl);

}

function showVendorDropdown(inputEl) {
    console.log("📌 showVendorDropdown() called");

    hideSuggestionList();

    const row = inputEl.closest("tr");
    const skuVal = row.querySelector(".sku-input")?.value?.trim() || "";

    console.log("📌 Current SKU Value:", skuVal);

    if (!skuVal) {
        console.log("❌ No SKU found — cannot show vendor list.");
        return;
    }

    let matches = window.skuData.filter(i =>
        i.SKU.toLowerCase() === skuVal.toLowerCase()
    );

    console.log("📌 Vendor matches found:", matches.length, matches);


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

            console.log("🖱 Selected suggestion:", li.textContent);

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
        const q = parseFloat(qty.value) || 0;
        const c = parseFloat(cost.value) || 0;
        const m = parseFloat(mult.value) || 1;
        const p = parseFloat(margin.value) || 0;

        const extCost = q * c * m;
        const totalCost = extCost * (1 + p / 100);

        ext.value = extCost.toFixed(2);
        total.value = totalCost.toFixed(2);

        console.log("🧮 Row recalculated:", { q, c, m, p, extCost, totalCost });

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

    console.log("💰 Updated Grand Total:", sum);
}


  // ==========================================================
  // EDIT MODE → LOAD TAKEOFF
  // ==========================================================
  async function loadExistingTakeoff(recId) {
    console.log("📥 Loading existing takeoff…");

    const url = `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}/${recId}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` },
    });

    const data = await res.json();
    const f = data.fields;

    // HEADER POPULATE
    nameInput.value = f["Plan name"] || f["Takeoff Name"] || "";
    typeSelect.value = f["Type"] || "";
    planSelect.value = f["Plan name"] || "";
    elevationSelect.value = f["Elevation"] || "";
    communitySelect.value = f["Community Name"] || "";

    // ⭐ FIX: Use friendly builder name
// FIRST: make sure builder dropdown is populated
await populateBuilderDropdown();

// THEN: set the builder value
const builderRecordId = f["Builder"]?.[0];

if (builderRecordId) {
    builderSelect.value = builderRecordId;
    console.log("Builder selected:", builderRecordId);
} else {
    console.warn("⚠ No builder linked");
}


    isLoadingEditMode = false; // allow table reveal
    revealLineItemsSection();

    // LOAD JSON ROW
    if (f["Takeoff Creation"] && f["Takeoff Creation"].length > 0) {
      await loadSkuJsonRecord(f["Takeoff Creation"][0]);
    }
  }

  // ==========================================================
  // LOAD JSON CONTENT INTO TABLE
  // ==========================================================
  async function loadSkuJsonRecord(jsonRecordId) {
    console.log("📦 Loading JSON SKU record:", jsonRecordId);

    const url = `https://api.airtable.com/v0/${BASE_ID2}/${SKU_TABLE_ID2}/${jsonRecordId}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` },
    });

    const data = await res.json();
    const json = JSON.parse(data.fields["Imported JSON"] || "[]");

    lineItemBody.innerHTML = "";

   json.forEach((item) => {
  const row = document.createElement("tr");
row.innerHTML = `
<td><input class="sku-input w-full" value="${item.SKU || ""}"></td>
<td><input class="desc-input w-full" value="${item.Description || ""}"></td>
<td><input class="uom-input w-full" value="${item.UOM || ""}"></td>

<td><input class="mat-input w-full" value="${item["Material Type"] || ""}"></td>
<td><input class="color-input w-full" value="${item["Color Group"] || ""}"></td>
<td><input class="vendor-input w-full" value="${item.Vendor || ""}"></td>

<td><input class="qty-input w-full" type="number" value="${item.Qty || 1}"></td>


<td><input class="cost-input w-full" type="number" value="${item["Unit Cost"] || 0}"></td>
<td><input class="mult-input w-full" type="number" value="${item["UOM Mult"] || 1}"></td>

<td><input class="extcost-input w-full" type="number" value="${item["Ext. Cost"] || 0}" readonly></td>

<td><input class="percent-input w-full" type="number" value="${item["%"] || 0}"></td>

<td><input class="total-input w-full" type="number" value="${item.Total || 0}" readonly></td>

<td class="text-center">
    <button class="remove-line text-red-500">🗑️</button>
</td>
`;


console.log(row.outerHTML);
console.log("DEBUG ROW:", row.outerHTML);

      lineItemBody.appendChild(row);
      enableVendorClickDropdown(row.querySelector(".vendor-input"));

attachAutocomplete(row.querySelector(".sku-input"), "sku");
      attachCalculators(row);

      row.querySelector(".remove-line").addEventListener("click", () => row.remove());
          updateGrandTotal();   // <-- add this!

    });
  }
}); // END DOM LOADED

// ==========================================================
// SAVE TAKEOFF (CALLED FROM HTML BUTTON)
// ==========================================================
async function saveTakeoff() {
  const editingId = localStorage.getItem("editingTakeoffId");

  // Collect header fields
  const fields = {
    "Takeoff Name": document.querySelector(
      'input[placeholder="E.g., Spanish Style"]'
    ).value,
    "Type": document.getElementById("takeoff-type").value,
    "Builder": [document.getElementById("builder-select").value],
    "Plan name": document.getElementById("plan-select").value,
    "Elevation": document.getElementById("elevation-select").value,
    "Community Name": document.getElementById("community-select").value,
  };

  // Build line item JSON
  const rows = [...document.querySelectorAll("#line-item-body tr")].map(
    (row) => {
      const inputs = row.querySelectorAll("input");
      const [
        sku,
        desc,
        uom,
        mat,
        color,
        qty,
        vendor,
        cost,
        mult,
        ext,
        margin,
        total,
      ] = inputs;

      return {
        SKU: sku.value,
        Description: desc.value,
        UOM: uom.value,
        "Material Type": mat.value,
        "Color Group": color.value,
        Qty: qty.value,
        Vendor: vendor.value,
        "Unit Cost": cost.value,
        "UOM Mult": mult.value,
        "Ext. Cost": ext.value,
        "%": margin.value,
        Total: total.value,
      };
    }
  );

  // SAVE JSON RECORD FIRST
  let jsonRecordId;

  if (editingId) {
    // fetch main record
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}/${editingId}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY2}` } }
    );

    const rec = await res.json();

    // If JSON record exists → update it
    if (rec.fields["Takeoff Creation"]) {
      jsonRecordId = rec.fields["Takeoff Creation"][0];

      await fetch(
        `https://api.airtable.com/v0/${BASE_ID2}/${SKU_TABLE_ID2}/${jsonRecordId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY2}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: { "Imported JSON": JSON.stringify(rows) },
          }),
        }
      );
    } else {
      // No JSON record → create one
      const createRes = await fetch(
        `https://api.airtable.com/v0/${BASE_ID2}/${SKU_TABLE_ID2}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY2}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: { "Imported JSON": JSON.stringify(rows) },
          }),
        }
      );

      const newJson = await createRes.json();
      jsonRecordId = newJson.id;

      fields["Takeoff Creation"] = [jsonRecordId];
    }
  } else {
    // NEW TAKEOFF MODE
    const createRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID2}/${SKU_TABLE_ID2}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY2}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: { "Imported JSON": JSON.stringify(rows) },
        }),
      }
    );

    const newJson = await createRes.json();
    jsonRecordId = newJson.id;

    fields["Takeoff Creation"] = [jsonRecordId];
  }

  // SAVE MAIN TAKEOFF RECORD
  if (editingId) {
    await fetch(
      `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}/${editingId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY2}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );
  } else {
    await fetch(
      `https://api.airtable.com/v0/${BASE_ID2}/${TAKEOFFS_TABLE_ID2}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY2}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );
  }

  alert("Saved successfully!");
  window.location.href = "takeoff.html";
}
