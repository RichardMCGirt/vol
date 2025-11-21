// sku-database.js
// Live connection to Google Sheets +
// Column A enabled + Sorting + Multi-sort + Sticky first column

const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv";

document.addEventListener("DOMContentLoaded", async () => {
  console.group("📦 SKU Database Initialization");
  const startTime = performance.now();

  const tableBody = document.getElementById("sku-table-body");
  const headerRow = document.getElementById("sku-header-row");
  const searchInput = document.getElementById("sku-search");
const vendorFilter = document.getElementById("vendor-filter");

  // ============================================================
  // GLOBAL STATE
  // ============================================================
  let dataRows = [];
  let headers = [];
  let sortConfig = []; // [{ col: Number, dir: "asc"|"desc" }]
  let originalRows = [];

  // Loading overlay
  const loadingOverlay = document.createElement("div");
  loadingOverlay.className =
    "fixed inset-0 bg-white bg-opacity-70 flex items-center justify-center text-gray-700 text-lg font-medium z-50";
  loadingOverlay.innerHTML = "⏳ Loading SKUs...";
  document.body.appendChild(loadingOverlay);

  try {
    // ============================================================
    // FETCH CSV
    // ============================================================
    console.time("Fetch Google Sheet");
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    console.timeEnd("Fetch Google Sheet");

    // ============================================================
    // PARSE CSV
    // ============================================================
console.time("Parse CSV");
const parsed = Papa.parse(csvText, {
  header: false,
  skipEmptyLines: true,
});
console.timeEnd("Parse CSV");

let rows = parsed.data;

// -----------------------------------------------
// REMOVE GOOGLE HEADER ROW (row 1)
// -----------------------------------------------
rows = rows.slice(1);

// -----------------------------------------------
// KEEP ONLY COLUMNS A → G (7 columns total)
// -----------------------------------------------
rows = rows.map(r => r.slice(0, 7));

// -----------------------------------------------
// REMOVE COMPLETELY EMPTY ROWS
// -----------------------------------------------
rows = rows.filter(r =>
  r.some(cell => String(cell).trim() !== "")
);

// -----------------------------------------------
// APPLY CUSTOM HEADERS
// -----------------------------------------------
headers = [
  "Vendor",
  "SKU",
  "UOM",
  "Description",
  "SKUHelper",
  "UOM Multiple",
  "Cost"
];

// -----------------------------------------------
// SET GLOBAL DATA SETS
// -----------------------------------------------
dataRows = [...rows];
originalRows = [...dataRows];
window.dataRows = dataRows; // for console debugging


// ============================================================
// DEFAULT SORT — SKU A → Z (Column 1)
// ============================================================
dataRows.sort((a, b) => {
  const A = (a[1] || "").toLowerCase();
  const B = (b[1] || "").toLowerCase();
  return A.localeCompare(B);
});

// Set sortConfig to reflect default sort
sortConfig = [{ col: 1, dir: "asc" }];
// ============================================================
// POPULATE VENDOR DROPDOWN
// ============================================================
const vendorIndex = headers.indexOf("Vendor");

// Collect uniques
const uniqueVendors = [...new Set(dataRows.map(r => r[vendorIndex]).filter(v => v.trim() !== ""))].sort();

// Add "All Vendors" option at top
vendorFilter.innerHTML = `<option value="">All Vendors</option>`;

uniqueVendors.forEach(v => {
  const opt = document.createElement("option");
  opt.value = v;
  opt.textContent = v;
  vendorFilter.appendChild(opt);
});


    // ============================================================
    // RENDER HEADER (with sorting)
    // ============================================================
    headerRow.innerHTML = "";
   headers.forEach((h, colIndex) => {
  const th = document.createElement("th");
  th.textContent = h;

  // ⭐ Sticky header — MUST BE HERE ⭐
  th.classList.add(
    "border",
    "px-3",
    "py-2",
    "text-left",
    "bg-gray-100",
    "cursor-pointer",
    "hover:bg-gray-200",
    "select-none",
    "sticky",
    "top-0",
    "z-20"
  );

  // ⭐ Click + Shift-click sorting ⭐
th.addEventListener("click", (e) => {
    const existing = sortConfig.find(r => r.col === colIndex);

    if (e.shiftKey) {
        if (existing) {
            existing.dir = existing.dir === "asc" ? "desc" : "asc";
        } else {
            sortConfig.push({ col: colIndex, dir: "asc" });
        }
    } else {
        if (existing) {
            existing.dir = existing.dir === "asc" ? "desc" : "asc";
            sortConfig = [existing];
        } else {
            sortConfig = [{ col: colIndex, dir: "asc" }];
        }
    }

    applySort();
    renderRows(searchInput.value);

    // ⭐ HIDE VENDOR COLUMN IF vendor column (0) is being sorted
    toggleVendorColumn(sortConfig[0]?.col === 0);

    updateSortArrows();
});


  headerRow.appendChild(th);
});


    // ============================================================
    // CURRENCY FORMATTER
    // ============================================================
    const usdFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });

    // ============================================================
    // SORT FUNCTION (single & multi-column)
    // ============================================================
    function applySort() {
      dataRows.sort((a, b) => {
        for (const rule of sortConfig) {
          const A = (a[rule.col] || "").toLowerCase();
          const B = (b[rule.col] || "").toLowerCase();
          if (A < B) return rule.dir === "asc" ? -1 : 1;
          if (A > B) return rule.dir === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    // ============================================================
    // UPDATE SORT ARROWS
    // ============================================================
    function updateSortArrows() {
      const ths = headerRow.querySelectorAll("th");

      ths.forEach((th, i) => {
        th.innerHTML = headers[i];

        const rule = sortConfig.find(r => r.col === i);
        if (rule) {
          const arrow = rule.dir === "asc" ? "▲" : "▼";
          const level = sortConfig.indexOf(rule) + 1;

          th.innerHTML = `${headers[i]} <span class="text-blue-600 ml-1">${arrow}${sortConfig.length > 1 ? " (" + level + ")" : ""}</span>`;
        }
      });
    }
function toggleVendorColumn(hide) {
    const table = document.querySelector("table");
    if (!table) return;

    // Header cell
    const th = headerRow.querySelector("th:nth-child(1)");
    if (th) th.style.display = hide ? "none" : "";

    // All data cells in first column
    const vendorCells = document.querySelectorAll("#sku-table-body tr td:nth-child(1)");
    vendorCells.forEach(td => {
        td.style.display = hide ? "none" : "";
    });
}

    // ============================================================
    // RENDER TABLE ROWS
    // ============================================================
   function renderRows(filterText = "", selectedVendor = vendorFilter.value) {
  const filter = filterText.toLowerCase();
  const vendorIndex = headers.indexOf("Vendor");
  const unitCostIndex = headers.indexOf("Unit Cost");

  // Filter logic
  let filtered = dataRows.filter(r => {
    const matchesText = filter === "" 
      ? true 
      : r.some(cell => cell.toLowerCase().includes(filter));

    const matchesVendor = selectedVendor === "" 
      ? true 
      : r[vendorIndex] === selectedVendor;

    return matchesText && matchesVendor;
  });

  // ------------------------------------------------------------
  // ⭐ Highlight lowest price when searching SKUs
  // ------------------------------------------------------------
  let lowestCostValue = null;
  if (filterText.trim() !== "") {
    const numericRows = filtered
      .map(r => ({ row: r, cost: parseFloat(r[unitCostIndex]) }))
      .filter(obj => !isNaN(obj.cost));

    if (numericRows.length) {
      lowestCostValue = Math.min(...numericRows.map(o => o.cost));
    }
  }

  // ------------------------------------------------------------
  // Render table
  // ------------------------------------------------------------
  const fragment = document.createDocumentFragment();

  filtered.forEach(r => {
    const tr = document.createElement("tr");

    // ⭐ Highlight row if it's the lowest cost match
    if (lowestCostValue !== null && parseFloat(r[unitCostIndex]) === lowestCostValue) {
      tr.classList.add("bg-green-100");
    }

    r.forEach((cell, colIndex) => {
      const td = document.createElement("td");
      td.classList.add("border", "px-3", "py-2", "text-sm", "whitespace-nowrap");

      if (colIndex === 0) {
        td.classList.add("sticky", "left-0", "bg-white", "z-10", "shadow-sm");
      }

      if ((colIndex === 6 || colIndex === 7) && !isNaN(parseFloat(cell))) {
        td.textContent = usdFormatter.format(parseFloat(cell));
        td.classList.add("text-right", "font-medium", "text-green-700");
      } else {
        td.textContent = cell;
      }

      tr.appendChild(td);
    });

    fragment.appendChild(tr);
  });

  tableBody.innerHTML = "";
  tableBody.appendChild(fragment);
}

    // INITIAL RENDER
    requestAnimationFrame(() => {
      renderRows();
      loadingOverlay.remove();
    });

    // SEARCH INPUT
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderRows(e.target.value);
      }, 200);
    });

  } catch (err) {
    console.error("❌ Fatal error loading SKU data:", err);
    tableBody.innerHTML =
      `<tr><td colspan="8" class="py-4 text-center text-red-600">Error loading data.</td></tr>`;
    loadingOverlay.remove();
  }
vendorFilter.addEventListener("change", () => {
    renderRows(searchInput.value, vendorFilter.value);
    toggleVendorColumn(sortConfig[0]?.col === 0);
});

searchInput.addEventListener("input", () => {
    renderRows(searchInput.value, vendorFilter.value);
    toggleVendorColumn(sortConfig[0]?.col === 0);
});


  const totalTime = performance.now() - startTime;
  console.log(`⏱️ Total init time: ${totalTime.toFixed(2)} ms`);
  console.groupEnd();
});
