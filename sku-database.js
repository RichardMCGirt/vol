// sku-database.js
// Live connection to Google Sheets (smooth render, skip first col & ≥8, format col 6-7 as USD)

const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv";

document.addEventListener("DOMContentLoaded", async () => {
  console.group("📦 SKU Database Initialization");
  const startTime = performance.now();

  const tableBody = document.getElementById("sku-table-body");
  const headerRow = document.getElementById("sku-header-row");
  const searchInput = document.getElementById("sku-search");

  // 💫 Loading overlay
  const loadingOverlay = document.createElement("div");
  loadingOverlay.className =
    "fixed inset-0 bg-white bg-opacity-70 flex items-center justify-center text-gray-700 text-lg font-medium z-50";
  loadingOverlay.innerHTML = "⏳ Loading SKUs...";
  document.body.appendChild(loadingOverlay);

  try {
    console.time("Fetch Google Sheet");
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    console.timeEnd("Fetch Google Sheet");

    console.time("Parse CSV");
    const rows = csvText.trim().split("\n").map(r => r.split(","));
    console.timeEnd("Parse CSV");

    if (rows.length < 2) {
      console.warn("⚠️ No data rows found.");
      tableBody.innerHTML =
        `<tr><td colspan="6" class="py-4 text-center text-gray-500">No data available.</td></tr>`;
      loadingOverlay.remove();
      return;
    }

    // Keep columns 1–7 (skip first col and 8+)
    const headers = rows[0].slice(1, 8);
    const dataRows = rows.slice(1).map(r => r.slice(1, 8));

    console.log(`🧱 Headers:`, headers);
    console.log(`✅ Parsed ${dataRows.length} rows (columns 1–7 kept)`);

    // 🏷️ Render headers
    if (headerRow) {
      headerRow.innerHTML = "";
      headers.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        th.classList.add("border", "px-3", "py-2", "text-left", "bg-gray-100");
        headerRow.appendChild(th);
      });
    }

    // 💵 US currency formatter
    const usdFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });

    // ⚡ Smooth render using DocumentFragment
    function renderRows(filter = "") {
      console.time("Render Rows");
      const filterTerm = filter.toLowerCase();

      const filtered = dataRows.filter(r =>
        r.some(cell => cell.toLowerCase().includes(filterTerm))
      );

      const fragment = document.createDocumentFragment();
      filtered.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach((cell, i) => {
          const td = document.createElement("td");
          td.classList.add("border", "px-3", "py-2", "text-sm", "whitespace-nowrap");

          // 💵 Format columns 6 & 7 (5 & 6 after trim) as USD if numeric
          if ((i === 5 || i === 6) && !isNaN(parseFloat(cell))) {
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

      console.log(
        `🔎 Filter "${filter}" → ${filtered.length}/${dataRows.length} rows`
      );
      console.timeEnd("Render Rows");
    }

    // 🖥️ Initial render
    requestAnimationFrame(() => {
      renderRows();
      loadingOverlay.remove();
    });

    // ⌨️ Debounced search
    let searchTimeout;
    searchInput.addEventListener("input", e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderRows(e.target.value);
      }, 200);
    });

  } catch (err) {
    console.error("❌ Fatal error loading SKU data:", err);
    tableBody.innerHTML =
      `<tr><td colspan="6" class="py-4 text-center text-red-600">Error loading data.</td></tr>`;
    loadingOverlay.remove();
  }

  const totalTime = performance.now() - startTime;
  console.log(`⏱️ Total init time: ${totalTime.toFixed(2)} ms`);
  console.groupEnd();
});
