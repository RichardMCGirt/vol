const TAKEOFF_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv&sheet=DataLoad";


let skuData = [];
let dataReady = false;
window.vendorList = [];

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
  console.log("📡 Fetching SKU CSV…");

  const response = await fetch(TAKEOFF_SHEET_URL);
  const csvText = await response.text();

  const rows = csvText
    .trim()
    .split("\n")
    .map(r => r.split(",").map(x => x.replace(/^"|"$/g, "")));

  console.log("📄 First 5 CSV rows:", rows.slice(0, 5));

  // Convert rows → objects
  const parsed = rows.map(r => ({
    Vendor: r[0],
    SKU: r[1],
    UOM: r[2],
    Description: r[3],
    SKUHelper: r[4]
  }));

  window.skuData = parsed;

  console.log("📦 Parsed SKU objects:", parsed.slice(0, 5));

  return parsed;
}

await fetchVendorsFromAirtable();

  await fetchSkuData();
async function fetchVendorsFromAirtable() {
  const API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c"; // ← USE THE CORRECT KEY
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const TABLE_ID = "tblyr8aUwDFnFnsHO";
  const VIEW_ID = "viwjb3uuGUFqwZrWe";

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!res.ok) {
    console.error("❌ Airtable vendor fetch failed:", res.status, res.statusText);
    return [];
  }

  const data = await res.json();

  if (!data.records) {
    console.error("❌ No records returned from Airtable:", data);
    return [];
  }

  window.vendorList = data.records
    .map(rec => rec.fields["Vendor Name"])
    .filter(Boolean);

  console.log("📦 Loaded vendors:", window.vendorList);
}
    await fetchVendorsFromAirtable();
    console.log("Vendors ready:", window.vendorList);


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

  let timeoutId = null;

  inputEl.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) return;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      searchSkuSuggestions(query, inputEl);
    }, 200);
  });
}

function searchSkuSuggestions(query, inputEl) {
  console.log(`🔍 Searching SKU suggestions for "${query}"...`);

const matches = window.skuData.filter(item =>
  item.SKU?.toLowerCase().includes(query) ||
  item.Description?.toLowerCase().includes(query)
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
  li.textContent = `${item.SKU} (${item.UOM}) — ${item.Description}`;
  li.style.cursor = "pointer";

  li.addEventListener("click", () => {

    inputEl.value = item.SKU;

    const row = inputEl.closest("tr");
    if (row) {
      const uomInput = row.querySelector('input[placeholder="UOM"]');
      const descInput = row.querySelector('input[placeholder="Description"]');
      const vendorSelect = row.querySelector('.vendor-select');

      if (uomInput) uomInput.value = item.UOM || "";
      if (descInput) descInput.value = item.Description || "";

    if (vendorSelect) {
  vendorSelect.innerHTML = `<option value="">Select Vendor</option>`;

  window.vendorList.forEach(vendor => {
    const opt = document.createElement("option");
    opt.value = vendor;
    opt.textContent = vendor;
    vendorSelect.appendChild(opt);
  });

  console.log("📦 Vendor dropdown populated from Airtable");
}

    }

    list.style.display = "none";
    console.log(`✅ Selected SKU: ${item.SKU}`);
  });

  list.appendChild(li);
});

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
<td>
  <select class="vendor-select w-full border border-gray-300 rounded-md text-sm">
    <option value="">Select Vendor</option>
  </select>
</td>
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
