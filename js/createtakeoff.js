const TAKEOFF_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv&sheet=DataLoad";


let skuData = [];
let dataReady = false;

document.addEventListener("DOMContentLoaded", async () => {
  console.group("🎬 Takeoff Creation Initialization");

  const nameInput = document.querySelector('input[placeholder="E.g., Spanish Style"]');
  const typeSelect = document.getElementById("takeoff-type");
  const builderSelect = document.getElementById("builder-select");
  const planSelect = document.getElementById("plan-select");
  const elevationSelect = document.getElementById("elevation-select");
  const tableSection = document.getElementById("line-items-section");
  const addLineItemBtn = document.getElementById("add-line-item");
  const lineItemBody = document.getElementById("line-item-body");

  // ✅ Fetch SKU data from your GAS web app
async function fetchSkuData() {
  console.log("📡 Fetching CSV from:", TAKEOFF_SHEET_URL);

  const response = await fetch(TAKEOFF_SHEET_URL);
  console.log("📨 HTTP Status:", response.status);

  const csvText = await response.text();
  console.log("📄 CSV Text first 200 chars:", csvText.slice(0, 200));

  // Parse CSV
  const rows = csvText
    .trim()
    .split("\n")
    .map(r => r.split(","));

  console.log("📊 Parsed rows:", rows.length);
  console.log("📊 First row:", rows[0]);

  // IMPORTANT: Save globally
  window.skuData = rows;

  console.log("💾 skuData saved. Length =", window.skuData.length);

  return rows;
}



// --- 🧩 Attach Autocomplete --- //
function attachAutocomplete(inputEl) {
  console.log("🧩 Attaching autocomplete to SKU input...");
  let timeoutId = null;

  inputEl.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) return;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      searchSkuSuggestions(query, inputEl); // ✅ pass it here
    }, 200);
  });
}



  await fetchSkuData();

  // Helper: check if all form fields filled
  function allFieldsFilled() {
    return builderSelect.value && planSelect.value;

  }

  // Show table when all required fields are complete
  [nameInput, typeSelect, builderSelect, planSelect, elevationSelect].forEach(el => {
    el.addEventListener("change", () => {
      if (allFieldsFilled()) {
        console.log("✅ Header fields completed — revealing table.");
        tableSection.classList.remove("hidden");
      }
    });
  });

  // ✅ Autocomplete setup
  function attachAutocomplete(inputEl) {
  console.log("🧩 Attaching autocomplete to SKU input...");

  let lastQuery = "";
  let timeoutId = null;

  inputEl.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();

    if (query.length < 2) return; // require at least 2 chars

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
searchSkuSuggestions(query, inputEl);
    }, 200); // 🕒 throttle (200ms delay)
  });
}
function searchSkuSuggestions(query, inputEl) {
  console.log(`🔍 Searching SKU suggestions for "${query}"...`);

  const matches = skuData.filter((item) =>
    item.SKU?.toLowerCase().includes(query)
  );

  console.log(`💡 Found ${matches.length} matches`);

  showSuggestions(matches.slice(0, 10), inputEl); // ✅ pass inputEl here
}


function showSuggestions(results, inputEl) {
   if (!inputEl) {
    console.warn("⚠️ No input element passed to showSuggestions.");
    return;
  }

  let list = document.getElementById("sku-suggestion-list");
  if (!list) {
    list = document.createElement("ul");
    list.id = "sku-suggestion-list";
    list.className = "sku-suggestion-list";
    document.body.appendChild(list);
  }

  list.innerHTML = "";

  if (results.length === 0) {
    list.style.display = "none";
    return;
  }
const el = document.getElementById("sku-suggestion-list");
if (el) {
  console.log("📏 Suggestion list rect:", el.getBoundingClientRect());
} else {
  console.warn("❌ sku-suggestion-list not found yet");
}

  const rect = inputEl.getBoundingClientRect(); // ✅ guaranteed safe now
  list.style.position = "absolute";
  list.style.left = `${rect.left + window.scrollX}px`;
  list.style.top = `${rect.bottom + window.scrollY}px`;
  list.style.width = `${rect.width}px`;
  list.style.display = "block";

 results.forEach((item) => {
  const li = document.createElement("li");
  li.textContent = `${item.SKU} — ${item.Description}`;
  li.style.cursor = "pointer";

  // 🔹 When user clicks a suggestion
  li.addEventListener("click", () => {
    // Fill SKU field
    inputEl.value = item.SKU;

    // Fill the rest of the row (UOM + Description)
const row = inputEl.closest("tr");
if (row) {
  const uomInput = row.querySelector('input[placeholder="UOM"]');
  const descInput = row.querySelector('input[placeholder="Description"]');

  if (uomInput) uomInput.value = item.UOM || "";
  if (descInput) descInput.value = item.Description || "";
}


    // Hide dropdown
    list.style.display = "none";
    console.log(`✅ Selected SKU: ${item.SKU}`);
  });

  list.appendChild(li);
});
}

  // ✅ Autofill logic
  function fillRowFromSku(row, data) {
    console.group("🧾 Filling row for selected SKU");
    console.log("Raw data:", data);

    const cells = row.querySelectorAll("input");
    const map = [
      "SKU Name",
      "Description",
      "UOM",
      "Material Type",
      "Color Group",
      "Quantity",
      "Vendor",
      "Unit Cost",
      "UOM Mult",
      "Extended Cost",
      "Margin %",
      "Total Price",
    ];

    // Check if SKU has multiple vendors
    const vendorMatches = skuData.filter(d => d["SKU Name"] === data["SKU Name"]);
    const vendorIsUnique = vendorMatches.length === 1;
    console.log(
      `Vendor uniqueness check: ${vendorMatches.length} found → ${
        vendorIsUnique ? "✅ unique vendor" : "⚠️ multiple vendors"
      }`
    );

    map.forEach((field, i) => {
      if (i === 5 || i === 10) return; // skip quantity, margin
      const cellInput = cells[i];
      if (!cellInput) return;

      if (field === "Vendor" && !vendorIsUnique) {
        console.log("🚫 Skipping vendor autofill (multiple vendors exist).");
        return;
      }

      if (data[field]) {
        cellInput.value = data[field];
        console.log(`→ ${field}:`, data[field]);
      }
    });

    console.groupEnd();
  }

  // ✅ Add new line item row
  addLineItemBtn?.addEventListener("click", () => {
    const row = document.createElement("tr");
    row.classList.add("relative");
    row.innerHTML = `
      <td class="border px-2 py-1 relative"><input class="sku-input w-full border-none focus:ring-0 text-sm" placeholder="SKU"></td>
      <td class="border px-2 py-1"><input class="w-full border-none text-sm" placeholder="Description"></td>
      <td class="border px-2 py-1"><input class="w-full border-none text-sm" placeholder="UOM"></td>
      <td class="border px-2 py-1"><input class="w-full border-none text-sm" placeholder="Material Type"></td>
      <td class="border px-2 py-1"><input class="w-full border-none text-sm" placeholder="Color Group"></td>
      <td class="border px-2 py-1"><input type="number" class="w-full border-none text-sm" placeholder="Qty"></td>
      <td class="border px-2 py-1"><input class="w-full border-none text-sm" placeholder="Vendor"></td>
      <td class="border px-2 py-1"><input type="number" class="w-full border-none text-sm" placeholder="Unit Cost"></td>
      <td class="border px-2 py-1"><input type="number" class="w-full border-none text-sm" placeholder="UOM Mult"></td>
      <td class="border px-2 py-1"><input type="number" class="w-full border-none text-sm" placeholder="Ext. Cost"></td>
      <td class="border px-2 py-1"><input type="number" class="w-full border-none text-sm" placeholder="%"></td>
      <td class="border px-2 py-1"><input type="number" class="w-full border-none text-sm" placeholder="Total"></td>
      <td class="border px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700 remove-line">🗑️</button>
      </td>
    `;
    lineItemBody.appendChild(row);
    console.log("➕ Added new line item row");

    const skuInput = row.querySelector(".sku-input");
    attachAutocomplete(skuInput, row);

    row.querySelector(".remove-line").addEventListener("click", () => {
      console.warn("🗑️ Line item removed");
      row.remove();
    });
  });

  console.groupEnd();
});
