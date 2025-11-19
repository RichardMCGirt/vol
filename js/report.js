/*****************************************
 * VANIR VOLCANO – REPORTS PAGE (FULL ANALYTICS)
 *****************************************/

console.log("📊 report.js loaded");

/* ------------------------------
   Airtable Config
------------------------------ */
const API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID = "appnZNCcUAJCjGp7L";
const ESTIMATOR_TABLE = "All Active Employees"; // <-- change if needed

const TAKEOFF_TABLE = "Takeoffs";
const BUILDERS_TABLE = "Builders";
const COMMUNITIES_TABLE = "Community";

let builderMap = {};
let residentialBuilderMap = {};

const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv";

/* ------------------------------
   Pagination State
------------------------------ */
let takeoffRecords = [];
let filteredRecords = [];
let currentPage = 1;
const pageSize = 8;

/*****************************************
 * Helper: Paginated Count
 *****************************************/
/*****************************************
 * FETCH ESTIMATOR NAMES (lookup map)
 *****************************************/

async function fetchEstimatorMap() {
  let map = {};
  let offset = null;

  do {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${ESTIMATOR_TABLE}?pageSize=100`;
    if (offset) url += `&offset=${offset}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const json = await res.json();

    json.records.forEach(rec => {
      map[rec.id] = rec.fields.Name || rec.fields["Full Name"] || "Unknown";
    });

    offset = json.offset;
  } while (offset);

  return map;
}
/*****************************************
 * FETCH BUILDER NAMES (lookup map)
 *****************************************/
async function fetchBuilderMaps() {
  let _builderMap = {};
  let _residentialMap = {};
  let offset = "";

  const url = `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE}`;

  while (true) {
    const res = await fetch(`${url}?pageSize=100${offset ? "&offset=" + offset : ""}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const json = await res.json();
    if (!json.records) break;

    json.records.forEach(rec => {
      const id = rec.id;
      const name =
        rec.fields["Client Name"] ||
        rec.fields.Name ||
        "Unknown";

      _builderMap[id] = name;

      if (rec.fields["Residential or Commercial ?"] === "Residential") {
        _residentialMap[id] = name;
      }
    });

    if (!json.offset) break;
    offset = json.offset;
  }

  // update globals
  builderMap = _builderMap;
  residentialBuilderMap = _residentialMap;
}



async function countAirtable(tableName, formula = null) {
  let total = 0, offset = null;
  do {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${tableName}?pageSize=100`;
    if (offset) url += `&offset=${offset}`;
    if (formula) url += `&filterByFormula=${encodeURIComponent(formula)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const json = await res.json();

    total += json.records.length;
    offset = json.offset;

  } while (offset);
  return total;
}

/*****************************************
 * COUNT FUNCTIONS
 *****************************************/

async function fetchActiveTakeoffs() {
  return countAirtable(TAKEOFF_TABLE, `{Active} = TRUE()`);
}

async function fetchResidentialBuilders() {
  return countAirtable(
    BUILDERS_TABLE,
    `{Residential or Commercial ?} = "Residential"`
  );
}

async function fetchCommunities() {
  return countAirtable(COMMUNITIES_TABLE);
}

async function fetchSkuCount() {
  return new Promise((resolve) => {
    Papa.parse(GOOGLE_SHEET_CSV_URL, {
      download: true,
      header: true,
      complete: (results) => resolve(results.data.length),
    });
  });
}

/*****************************************
 * FETCH TAKEOFF RECORDS (FULL)
 *****************************************/
async function fetchAllTakeoffRecords() {
  let records = [];
  let offset = null;

  do {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TAKEOFF_TABLE}?pageSize=100`;
    if (offset) url += `&offset=${offset}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const json = await res.json();

    records = records.concat(json.records);
    offset = json.offset;

  } while (offset);

  takeoffRecords = records;
  filteredRecords = records;
}

/*****************************************
 * FILTER LOGIC
 *****************************************/
function applyFilters(builderMap) {

  console.log("🌀 APPLY FILTERS — builderMap:", builderMap); // debug
  const searchValue = document.getElementById("filter-search").value.toLowerCase();
  const builderFilter = document.getElementById("filter-builder").value;
  const statusFilter = document.getElementById("filter-status").value;
  const typeFilter = document.getElementById("filter-type").value;

  filteredRecords = takeoffRecords.filter((rec) => {
    const f = rec.fields;

    const matchesSearch = f["Takeoff Name"]
      ?.toLowerCase()
      .includes(searchValue);

const matchesBuilder =
  builderFilter === "All" ||
  (f.Builder || []).some(id => builderMap[id] === builderFilter);


    const matchesStatus =
      statusFilter === "All" ||
      f.Status === statusFilter;

    const matchesType =
      typeFilter === "All" ||
      f.Type === typeFilter;

    return matchesSearch && matchesBuilder && matchesStatus && matchesType;
  });

  currentPage = 1;
  renderTable();
}

/*****************************************
 * RENDER PAGINATED TABLE
 *****************************************/
function renderTable() {
  const tableBody = document.getElementById("report-table-body");
  tableBody.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageRecords = filteredRecords.slice(start, end);

  pageRecords.forEach((rec) => {
    const f = rec.fields;

    const activeDot = f.Active ? "bg-green-500" : "bg-gray-400";

    tableBody.innerHTML += `
      <tr>
        <td class="py-3 px-3">
          <div class="w-3 h-3 ${activeDot} rounded-full mx-auto"></div>
        </td>
        <td class="py-3 px-3 font-semibold">${f["Takeoff Name"] || ""}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-1 bg-black text-white text-xs rounded-md">
            ${f.Type || ""}
          </span>
        </td>
   <td class="py-3 px-3">
  ${ (f.Builder || [])
      .map(id => builderMap[id] || "Unknown Builder")
      .join(", ")
    }
</td>

        <td class="py-3 px-3">
          <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-md">
            ${f.Status || "Unknown"}
          </span>
        </td>
        <td class="py-3 px-3 text-right">⋮</td>
      </tr>
    `;
  });

  document.getElementById("total-records").textContent =
    `Total Records: ${filteredRecords.length}`;

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  document.getElementById("pagination-label").textContent =
    `${currentPage} / ${totalPages}`;
}

/*****************************************
 * BUTTON EVENTS
 *****************************************/
function nextPage() {
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}

/*****************************************
 * POPULATE BUILDER DROPDOWN
 *****************************************/
async function populateBuilderFilter(builderMap) {
  const select = document.getElementById("filter-builder");

  // Clear old entries except "All"
  select.innerHTML = `<option value="All">All Builders</option>`;

  const builderNames = Object.values(builderMap).sort();

  builderNames.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}


/*****************************************
 * CHARTS
 *****************************************/
function renderCharts(estimatorMap, builderMap) {
  /***********************************
   * PIE CHART (Base vs Option)
   **********************************/
  const typeCounts = { Base: 0, Option: 0 };

  takeoffRecords.forEach((rec) => {
    if (rec.fields.Type === "Base") typeCounts.Base++;
    if (rec.fields.Type === "Option") typeCounts.Option++;
  });

  new Chart(document.getElementById("type-chart"), {
    type: "pie",
    data: {
      labels: ["Base", "Option"],
      datasets: [
        {
          data: [typeCounts.Base, typeCounts.Option],
          backgroundColor: ["#3B82F6", "#F97316"],
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });

  /***********************************
   * BAR CHART — TAKEOFFS BY ESTIMATOR
   **********************************/
  /***********************************
 * BAR CHART — TAKEOFFS BY ESTIMATOR (Real Names)
 **********************************/
/***********************************
 * BAR CHART — TAKEOFFS BY ESTIMATOR
 **********************************/
(function() {

  const estimatorCounts = {};

  takeoffRecords.forEach((rec) => {
    const estIds = rec.fields.Estimator;
    if (!estIds || !Array.isArray(estIds)) return;

    estIds.forEach(id => {
      const name = estimatorMap[id] || "Unknown";
      estimatorCounts[name] = (estimatorCounts[name] || 0) + 1;
    });
  });

  const estimators = Object.keys(estimatorCounts);
  const counts = Object.values(estimatorCounts);

  if (estimators.length === 0) {
    console.warn("⚠️ No estimator names found");
    return;
  }

  new Chart(document.getElementById("estimator-chart"), {
    type: "bar",
    data: {
      labels: estimators,
      datasets: [
        {
          label: "Takeoffs",
          data: counts,
          backgroundColor: "#10B981",
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { beginAtZero: true },
      },
    },
  });

})();
/***********************************
 * BAR CHART — TAKEOFFS BY BUILDER
 **********************************/
(function() {

  const builderCounts = {};

  takeoffRecords.forEach((rec) => {
    const builderIds = rec.fields.Builder;
    if (!builderIds || !Array.isArray(builderIds)) return;

    builderIds.forEach(id => {
      const name = builderMap[id] || "Unknown Builder";
      builderCounts[name] = (builderCounts[name] || 0) + 1;
    });
  });

  const builderNames = Object.keys(builderCounts);
  const counts = Object.values(builderCounts);

  if (builderNames.length === 0) {
    console.warn("⚠️ No builder names found.");
    return;
  }

  new Chart(document.getElementById("builder-chart"), {
    type: "bar",
    data: {
      labels: builderNames,
      datasets: [
        {
          label: "Takeoffs",
          data: counts,
          backgroundColor: "#6366F1", // Indigo-500
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
})();

}



/*****************************************
 * CSV EXPORT
 *****************************************/
function exportToCSV() {
  let csv = "Active,Takeoff Name,Type,Builder,Status\n";

  filteredRecords.forEach((rec) => {
    const f = rec.fields;
    csv += [
      f.Active ? "Yes" : "No",
      f["Takeoff Name"] || "",
      f.Type || "",
(f.Builder || [])
  .map(id => builderMap[id] || "Unknown Builder")
  .join("; "),
        f.Status || "",
    ].join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "takeoffs_report.csv";
  link.click();
}

/*****************************************
 * MAIN INITIALIZATION
 *****************************************/
async function initReports() {
  console.log("📊 Initializing reports...");

  const [
    activeTakeoffs,
    residentialBuilders,
    communities,
    skuCount,
  ] = await Promise.all([
    fetchActiveTakeoffs(),
    fetchResidentialBuilders(),
    fetchCommunities(),
    fetchSkuCount(),
  ]);

  // Update stats
  document.getElementById("report-active-takeoffs").textContent = activeTakeoffs;
  document.getElementById("report-builders").textContent = residentialBuilders;
  document.getElementById("report-communities").textContent = communities;
  document.getElementById("report-skus").textContent = skuCount;

const estimatorMap = await fetchEstimatorMap();
await fetchBuilderMaps();

await fetchAllTakeoffRecords();
await populateBuilderFilter(builderMap);

applyFilters(builderMap);
renderCharts(estimatorMap, builderMap);




}

document.addEventListener("DOMContentLoaded", initReports);

// Expose pagination + CSV to window
window.nextPage = nextPage;
window.prevPage = prevPage;
window.applyFilters = applyFilters;
window.exportToCSV = exportToCSV;
