// takeoff-builder.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 takeoff-builder.js initialized");

  // ---------------- CONFIG ----------------
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L"; // ✅ unified base for Builders + Communities

  // Tables and fields
  const BUILDERS_TABLE_ID = "tblDkASnuImCKBQyO"; // field: Client Name
  const COMMUNITIES_TABLE_ID = "tblYIxFxH2swiBZiI"; // field: Community Name
const VIEW_NAME = "Grid view";

  // ✅ Live SKU source (Google Sheet CSV)
  const GOOGLE_SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv";

  // ---------------- DOM ELEMENTS ----------------
  const builderSelect = document.getElementById("builder-select");
  const communitySelect = document.getElementById("community-select");
  const placeholder = document.querySelector(".border-dashed");
  const mainSection = document.querySelector("section.bg-white");

  if (!builderSelect || !communitySelect) {
    console.error("❌ Missing required dropdown elements in DOM");
    return;
  }

  // ---------------- FETCH FROM AIRTABLE ----------------
  async function fetchAirtableRecords(tableId, fieldName) {
    let all = [];
    let offset = "";
    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
url.searchParams.append("view", VIEW_NAME);
      if (offset) url.searchParams.append("offset", offset);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const values = data.records.map(r => r.fields[fieldName]).filter(Boolean);
      all.push(...values);
      offset = data.offset || "";
    } while (offset);

    return [...new Set(all)].sort();
  }

  // ---------------- POPULATE DROPDOWNS ----------------
  async function populateBuilderDropdown() {
    const builders = await fetchAirtableRecords(BUILDERS_TABLE_ID, "Client Name");
    builderSelect.innerHTML =
      `<option value="">Select Builder</option>` +
      builders.map(b => `<option>${b}</option>`).join("");
    console.log(`🏗️ Loaded ${builders.length} builders`);
  }

  async function populateCommunityDropdown() {
    const communities = await fetchAirtableRecords(COMMUNITIES_TABLE_ID, "Community Name");
    communitySelect.innerHTML =
      `<option value="">Select Community</option>` +
      communities.map(c => `<option>${c}</option>`).join("");
    console.log(`🏡 Loaded ${communities.length} communities`);
  }

  // ---------------- FETCH LIVE SKU DATA ----------------
  async function fetchSKUData() {
    console.log("📦 Fetching live SKU data...");
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();

    const rows = csvText.trim().split("\n").map(r => r.split(","));
    const headers = rows[0].slice(1, 8); // skip first column
    const dataRows = rows.slice(1).map(r => r.slice(1, 8));

    console.log(`✅ Parsed ${dataRows.length} SKUs`);
    return { headers, dataRows };
  }

  // ---------------- RENDER SKU TABLE ----------------
  function renderSKUTable(headers, dataRows) {
    console.log("🧱 Rendering SKU table");

    const container = document.createElement("div");
    container.className =
      "mt-10 border border-gray-200 rounded-lg bg-white shadow-sm overflow-x-auto";

    const searchBar = document.createElement("input");
    searchBar.type = "text";
    searchBar.placeholder = "Search SKUs...";
    searchBar.className =
      "mb-4 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none";

    const table = document.createElement("table");
    table.className = "min-w-full text-sm border-collapse border border-gray-200";

    // Header
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    headers.forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      th.className = "border px-3 py-2 text-left bg-gray-100 font-semibold text-xs";
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    // Body
    const tbody = document.createElement("tbody");
    const usd = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });

    dataRows.forEach(row => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50";
      row.forEach((cell, i) => {
        const td = document.createElement("td");
        td.className = "border px-3 py-2 text-sm whitespace-nowrap";
        if ((i === 5 || i === 6) && !isNaN(parseFloat(cell))) {
          td.textContent = usd.format(parseFloat(cell));
          td.classList.add("text-right", "font-medium", "text-green-700");
        } else {
          td.textContent = cell;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(searchBar);
    container.appendChild(table);
    mainSection.appendChild(container);

    // Search functionality
    searchBar.addEventListener("input", e => {
      const term = e.target.value.toLowerCase();
      Array.from(tbody.rows).forEach(tr => {
        const match = Array.from(tr.cells).some(td =>
          td.textContent.toLowerCase().includes(term)
        );
        tr.style.display = match ? "" : "none";
      });
    });
  }

  // ---------------- MAIN ----------------
  try {
    await Promise.all([populateBuilderDropdown(), populateCommunityDropdown()]);

    const createBtn = placeholder.querySelector("button");
    createBtn.addEventListener("click", async () => {
      placeholder.remove();
      const { headers, dataRows } = await fetchSKUData();
      renderSKUTable(headers, dataRows);
    });
  } catch (err) {
    console.error("❌ Error initializing Takeoff Builder:", err);
  }
});
