// ==========================================================
// createtakeoff.js  (FINAL STABLE VERSION)
// ==========================================================

// Google Sheet CSV for SKU master data
const TAKEOFF_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv&sheet=DataLoad";

// Airtable configs
const AIRTABLE_API_KEY2 =
  "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID2 = "appnZNCcUAJCjGp7L";
const TAKEOFFS_TABLE_ID2 = "tblZpnyqHJeC1IaZq";
const SKU_TABLE_ID2 = "tblcG08fWPOesXDfC"; // JSON table

window.skuData = [];

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
      .map((r) => r.split(",").map((x) => x.replace(/^"|"$/g, "")));

    const parsed = rows.map((r) => ({
      Vendor: r[0],
      SKU: r[1],
      UOM: r[2],
      Description: r[3],
      SKUHelper: r[4],
      UOMMult: parseFloat(r[5]) || 1,
      Cost: parseFloat(r[6]) || 0,
    }));

    window.skuData = parsed;
    console.log("📦 SKU parsed:", parsed.slice(0, 5));
  }

  // ==========================================================
  // ADD LINE ITEM FROM SKU CSV
  // ==========================================================
  function addLineItemFromSku(skuObj) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input class="sku-input w-full" placeholder="SKU" value="${skuObj.SKU}"></td>
      <td><input class="w-full" placeholder="Description" value="${skuObj.Description}"></td>
      <td><input class="w-full" placeholder="UOM" value="${skuObj.UOM}"></td>
      <td><input class="w-full" placeholder="Material Type"></td>
      <td><input class="w-full" placeholder="Color Group"></td>
      <td><input type="number" class="w-full" placeholder="Qty" value="1"></td>
      <td><input class="w-full" placeholder="Vendor" value="${skuObj.Vendor}"></td>
      <td><input type="number" class="w-full" placeholder="Unit Cost" value="${skuObj.Cost}"></td>
      <td><input type="number" class="w-full" placeholder="UOM Mult" value="${skuObj.UOMMult}"></td>
      <td><input type="number" class="w-full" placeholder="Ext. Cost"></td>
      <td><input type="number" class="w-full" placeholder="%"></td>
      <td><input type="number" class="w-full" placeholder="Total"></td>
      <td class="text-center"><button class="remove-line text-red-500">🗑️</button></td>
    `;

    lineItemBody.appendChild(row);
    attachAutocomplete(row.querySelector(".sku-input"));
    attachCalculators(row);

    row.querySelector(".remove-line").addEventListener("click", () => row.remove());
  }

  // ==========================================================
  // ADD BLANK LINE
  // ==========================================================
  function addLineItem() {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input class="sku-input w-full" placeholder="SKU"></td>
      <td><input class="w-full" placeholder="Description"></td>
      <td><input class="w-full" placeholder="UOM"></td>
      <td><input class="w-full" placeholder="Material Type"></td>
      <td><input class="w-full" placeholder="Color Group"></td>
      <td><input type="number" class="w-full" placeholder="Qty"></td>
      <td><input class="w-full" placeholder="Vendor"></td>
      <td><input type="number" class="w-full" placeholder="Unit Cost"></td>
      <td><input type="number" class="w-full" placeholder="UOM Mult"></td>
      <td><input type="number" class="w-full" placeholder="Ext. Cost"></td>
      <td><input type="number" class="w-full" placeholder="%"></td>
      <td><input type="number" class="w-full" placeholder="Total"></td>
      <td class="text-center"><button class="remove-line text-red-500">🗑️</button></td>
    `;

    lineItemBody.appendChild(row);
    attachAutocomplete(row.querySelector(".sku-input"));
    attachCalculators(row);

    row.querySelector(".remove-line").addEventListener("click", () => row.remove());
  }

  if (addLineItemBtn) addLineItemBtn.addEventListener("click", addLineItem);

  // ==========================================================
  // AUTOCOMPLETE
  // ==========================================================
  function attachAutocomplete(inputEl) {
    if (!inputEl) return;

    let timeout;
    inputEl.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      if (q.length < 2) return hideSuggestionList();

      clearTimeout(timeout);
      timeout = setTimeout(() => searchSkuSuggestions(q, inputEl), 180);
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => hideSuggestionList(), 200);
    });
  }

  function searchSkuSuggestions(query, inputEl) {
    const matches = window.skuData.filter(
      (i) =>
        i.SKU.toLowerCase().includes(query) ||
        i.Description.toLowerCase().includes(query)
    );

    showSuggestions(matches.slice(0, 12), inputEl);
  }

  function getSuggestionList() {
    let list = document.getElementById("sku-suggestion-list");
    if (!list) {
      list = document.createElement("ul");
      list.id = "sku-suggestion-list";
      list.className = "sku-suggestion-list";
      document.body.appendChild(list);
    }
    return list;
  }

  function hideSuggestionList() {
    const list = document.getElementById("sku-suggestion-list");
    if (list) list.style.display = "none";
  }

  function showSuggestions(results, inputEl) {
    if (!results.length) return hideSuggestionList();

    const list = getSuggestionList();
    list.innerHTML = "";

    const rect = inputEl.getBoundingClientRect();
    list.style.position = "absolute";
    list.style.left = `${rect.left + window.scrollX}px`;
    list.style.top = `${rect.bottom + window.scrollY}px`;
    list.style.width = `${rect.width}px`;
    list.style.display = "block";

    results.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.SKU} (${item.UOM}) — ${item.Description}`;
      li.style.cursor = "pointer";

      li.addEventListener("click", () => {
        inputEl.value = item.SKU;

        const row = inputEl.closest("tr");
        if (!row) return;

        row.querySelector('input[placeholder="Description"]').value =
          item.Description || "";
        row.querySelector('input[placeholder="UOM"]').value = item.UOM || "";

        row.querySelector('input[placeholder="Unit Cost"]').value =
          item.Cost.toFixed(2);
        row.querySelector('input[placeholder="UOM Mult"]').value =
          item.UOMMult;

        hideSuggestionList();
      });

      list.appendChild(li);
    });
  }

  // ==========================================================
  // CALCULATOR
  // ==========================================================
  function attachCalculators(row) {
    const qty = row.querySelector('input[placeholder="Qty"]');
    const cost = row.querySelector('input[placeholder="Unit Cost"]');
    const ext = row.querySelector('input[placeholder="Ext. Cost"]');
    const margin = row.querySelector('input[placeholder="%"]');
    const total = row.querySelector('input[placeholder="Total"]');

    function recalc() {
      const q = parseFloat(qty.value) || 0;
      const c = parseFloat(cost.value) || 0;
      const e = q * c;
      ext.value = e.toFixed(2);

      const m = parseFloat(margin.value) || 0;
      total.value = (e * (1 + m / 100)).toFixed(2);
    }

    qty.addEventListener("input", recalc);
    cost.addEventListener("input", recalc);
    margin.addEventListener("input", recalc);
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
    builderSelect.value = f["Builder"]?.[0] || "";

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
        <td><input class="sku-input w-full" value="${item.SKU || ""}" placeholder="SKU"></td>
        <td><input class="w-full" value="${item.Description || ""}" placeholder="Description"></td>
        <td><input class="w-full" value="${item.UOM || ""}" placeholder="UOM"></td>
        <td><input class="w-full" value="${item["Material Type"] || ""}" placeholder="Material Type"></td>
        <td><input class="w-full" value="${item["Color Group"] || ""}" placeholder="Color Group"></td>
        <td><input class="w-full" value="${item.Qty || ""}" placeholder="Qty"></td>
        <td><input class="w-full" value="${item.Vendor || ""}" placeholder="Vendor"></td>
        <td><input class="w-full" value="${item["Unit Cost"] || ""}" placeholder="Unit Cost"></td>
        <td><input class="w-full" value="${item["UOM Mult"] || ""}" placeholder="UOM Mult"></td>
        <td><input class="w-full" value="${item["Ext. Cost"] || ""}" placeholder="Ext. Cost"></td>
        <td><input class="w-full" value="${item["%"] || ""}" placeholder="%"></td>
        <td><input class="w-full" value="${item.Total || ""}" placeholder="Total"></td>
        <td class="text-center"><button class="remove-line text-red-500">🗑️</button></td>
      `;

      lineItemBody.appendChild(row);
      attachAutocomplete(row.querySelector(".sku-input"));
      attachCalculators(row);

      row.querySelector(".remove-line").addEventListener("click", () => row.remove());
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
