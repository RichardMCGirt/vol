// createtakeoff.js

// URL to your published Google Sheet CSV (DataLoad sheet)
const TAKEOFF_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv&sheet=DataLoad";

window.skuData = [];

// Main bootstrap
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🎬 Takeoff Creation Initialization");

  // ------- Grab DOM elements -------
  const nameInput = document.querySelector('input[placeholder="E.g., Spanish Style"]');
  const typeSelect = document.getElementById("takeoff-type");
  const builderSelect = document.getElementById("builder-select");
  const planSelect = document.getElementById("plan-select");
  const elevationSelect = document.getElementById("elevation-select");
  const communitySelect = document.getElementById("community-select");

  const placeholderBox = document.getElementById("placeholder-box");
  const lineItemsSection = document.getElementById("line-items-section");
  const addLineItemBtn = document.getElementById("add-line-item");
  const lineItemBody = document.getElementById("line-item-body");

  if (!nameInput || !typeSelect || !builderSelect || !planSelect || !elevationSelect || !communitySelect) {
    console.error("❌ Missing header elements. Check IDs in takeoff-creation.html");
  }
  if (!placeholderBox || !lineItemsSection || !addLineItemBtn || !lineItemBody) {
    console.error("❌ Missing line-item elements. Check placeholder/table IDs in takeoff-creation.html");
  }

  // ------- Fetch SKU data from CSV -------
  async function fetchSkuData() {
    console.log("📡 Fetching SKU CSV…");

    const response = await fetch(TAKEOFF_SHEET_URL);
    const csvText = await response.text();

    const rows = csvText
      .trim()
      .split("\n")
      .map((r) => r.split(",").map((x) => x.replace(/^"|"$/g, "")));

    console.log("📄 First 5 CSV rows:", rows.slice(0, 5));

    const parsed = rows.map((r) => ({
      Vendor: r[0],
      SKU: r[1],
      UOM: r[2],
      Description: r[3],
      SKUHelper: r[4],
    }));

    window.skuData = parsed;
    console.log("📦 Parsed SKU objects:", parsed.slice(0, 5));
  }

  await fetchSkuData();

  // ------- Header completion logic (show table when ready) -------
  function allFieldsFilled() {
    const nameVal = nameInput?.value.trim();
    const typeVal = typeSelect?.value;
    const builderVal = builderSelect?.value;
    const planVal = planSelect?.value;
    const elevationVal = elevationSelect?.value;
    const communityVal = communitySelect?.value;

    return (
      !!nameVal &&
      !!typeVal &&
      !!builderVal &&
      !!planVal &&
      !!elevationVal &&
      !!communityVal
    );
  }

  function revealLineItemsSection() {
    if (!placeholderBox || !lineItemsSection) return;

    placeholderBox.classList.add("hidden");
    lineItemsSection.classList.remove("hidden");

    // Smooth fade-in
    requestAnimationFrame(() => {
      lineItemsSection.style.opacity = "1";
    });
  }

  function maybeShowLineItems() {
    if (allFieldsFilled()) {
      console.log("✅ Header fields completed — revealing table.");
      revealLineItemsSection();
    }
  }

  // Attach listeners to all header inputs/selects
  [nameInput, typeSelect, builderSelect, planSelect, elevationSelect, communitySelect]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("change", maybeShowLineItems);
      el.addEventListener("input", maybeShowLineItems);
    });

  // ------- SKU Autocomplete -------

  function attachAutocomplete(inputEl) {
    if (!inputEl) return;
    console.log("🧩 Attaching autocomplete to SKU input...");

    let timeoutId = null;

    inputEl.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length < 2) {
        hideSuggestionList();
        return;
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        searchSkuSuggestions(query, inputEl);
      }, 200);
    });

    // Hide suggestions on blur (with slight delay so click can register)
    inputEl.addEventListener("blur", () => {
      setTimeout(() => hideSuggestionList(), 200);
    });
  }

  function searchSkuSuggestions(query, inputEl) {
    console.log(`🔍 Searching SKU suggestions for "${query}"...`);

    const matches = window.skuData.filter(
      (item) =>
        item.SKU?.toLowerCase().includes(query) ||
        item.Description?.toLowerCase().includes(query)
    );

    console.log(`💡 Found ${matches.length} matches`);
    showSuggestions(matches.slice(0, 10), inputEl);
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
    if (list) {
      list.style.display = "none";
      list.innerHTML = "";
    }
  }

  function showSuggestions(results, inputEl) {
    if (!inputEl) {
      console.warn("⚠️ No input element passed to showSuggestions.");
      return;
    }

    const list = getSuggestionList();
    list.innerHTML = "";

    if (results.length === 0) {
      list.style.display = "none";
      return;
    }

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
        inputEl.value = item.SKU || "";

        const row = inputEl.closest("tr");
        if (row) {
          const uomInput = row.querySelector('input[placeholder="UOM"]');
          const descInput = row.querySelector('input[placeholder="Description"]');
          const vendorSelect = row.querySelector(".vendor-select");

          if (uomInput) uomInput.value = item.UOM || "";
          if (descInput) descInput.value = item.Description || "";

          // Populate Vendor dropdown from CSV for this SKU
          if (vendorSelect) {
            vendorSelect.innerHTML = `<option value="">Select Vendor</option>`;

            const matchingVendors = window.skuData
              .filter((v) => v.SKU === item.SKU)
              .map((v) => v.Vendor)
              .filter((v) => v && v.trim() !== "");

            const uniqueVendors = [...new Set(matchingVendors)];

            uniqueVendors.forEach((vendor) => {
              const opt = document.createElement("option");
              opt.value = vendor;
              opt.textContent = vendor;
              vendorSelect.appendChild(opt);
            });

            console.log(
              "📦 Vendor dropdown populated from CSV for SKU:",
              item.SKU,
              "Vendors:",
              uniqueVendors
            );
          }
        }

        hideSuggestionList();
        console.log(`✅ Selected SKU: ${item.SKU}`);
      });

      list.appendChild(li);
    });
  }

  // ------- Line Item Row Logic -------

  function addLineItem() {
    if (!lineItemBody) return;

    const row = document.createElement("tr");
    row.classList.add("relative");

    row.innerHTML = `
      <td class="border px-2 py-1 relative">
        <input class="sku-input w-full border-none focus:ring-0 text-sm" placeholder="SKU">
      </td>
      <td class="border px-2 py-1">
        <input class="w-full border-none text-sm" placeholder="Description">
      </td>
      <td class="border px-2 py-1">
        <input class="w-full border-none text-sm" placeholder="UOM">
      </td>
      <td class="border px-2 py-1">
        <input class="w-full border-none text-sm" placeholder="Material Type">
      </td>
      <td class="border px-2 py-1">
        <input class="w-full border-none text-sm" placeholder="Color Group">
      </td>
      <td class="border px-2 py-1">
        <input type="number" class="w-full border-none text-sm" placeholder="Qty">
      </td>
      <td class="border px-2 py-1">
        <select class="vendor-select w-full border border-gray-300 rounded-md text-sm">
          <option value="">Select Vendor</option>
        </select>
      </td>
      <td class="border px-2 py-1">
        <input type="number" class="w-full border-none text-sm" placeholder="Unit Cost">
      </td>
      <td class="border px-2 py-1">
        <input type="number" class="w-full border-none text-sm" placeholder="UOM Mult">
      </td>
      <td class="border px-2 py-1">
        <input type="number" class="w-full border-none text-sm" placeholder="Ext. Cost">
      </td>
      <td class="border px-2 py-1">
        <input type="number" class="w-full border-none text-sm" placeholder="%">
      </td>
      <td class="border px-2 py-1">
        <input type="number" class="w-full border-none text-sm" placeholder="Total">
      </td>
      <td class="border px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700 remove-line">🗑️</button>
      </td>
    `;

    lineItemBody.appendChild(row);
    console.log("➕ Added new line item row");

    const skuInput = row.querySelector(".sku-input");
    attachAutocomplete(skuInput);

    const removeBtn = row.querySelector(".remove-line");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        console.warn("🗑️ Line item removed");
        row.remove();
      });
    }
  }

  // Attach click handler to Add Line Item button
  if (addLineItemBtn) {
    addLineItemBtn.addEventListener("click", () => {
      console.log("🖱️ Add Line Item button clicked");
      addLineItem();
    });
  } else {
    console.error("❌ add-line-item button not found in DOM.");
  }

  console.groupEnd();
});
