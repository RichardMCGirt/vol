/*****************************************
 * VANIR VOLCANO DASHBOARD LIVE STAT LOADER
 *****************************************/

const API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID = "appnZNCcUAJCjGp7L";

const TAKEOFF_TABLE = "Takeoffs";
const BUILDERS_TABLE = "Builders";
const COMMUNITIES_TABLE = "Community";

const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1E3sRhqKfzxwuN6VOmjI2vjWsk_1QALEKkX7mNXzlVH8/gviz/tq?tqx=out:csv";

/*****************************************
 * Helper: Fetch Airtable Count
 *****************************************/
async function fetchAirtableCount(tableName) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableName}?pageSize=1`;

  console.log(`📡 Fetching count for: ${tableName}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) {
    console.error(`❌ Error fetching ${tableName}:`, await res.text());
    return 0;
  }

  const json = await res.json();

  // Log first response for debugging
  console.log(`🔍 First batch from ${tableName}:`, json.records.length, "offset:", json.offset);

  if (json.offset) {
    return await countAllAirtableRecords(tableName);
  }

  return json.records.length;
}

/*****************************************
 * Recursive Counter for Tables >100 Rows
 *****************************************/
async function countAllAirtableRecords(tableName, offset = null, total = 0) {
  let url = `https://api.airtable.com/v0/${BASE_ID}/${tableName}?pageSize=100`;

  if (offset) url += `&offset=${offset}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  const json = await res.json();

  total += json.records.length;

  console.log(`📦 Batch loaded from ${tableName}:`, json.records.length, "running total:", total);

  if (json.offset) {
    return await countAllAirtableRecords(tableName, json.offset, total);
  }

  return total;
}
/*****************************************
 * Fetch Builders Count (Residential only)
 *****************************************/
async function fetchResidentialBuilders() {
  const formula = encodeURIComponent(`{Residential or Commercial ?} = "Residential"`);
  const url = `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE}?filterByFormula=${formula}&pageSize=100`;

  let total = 0;
  let offset = null;

  do {
    let pagedUrl = url + (offset ? `&offset=${offset}` : "");

    const res = await fetch(pagedUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const json = await res.json();

    total += json.records.length;
    offset = json.offset;

  } while (offset);

  return total;
}

/*****************************************
 * Google Sheet SKU Count
 *****************************************/
async function fetchSkuCount() {
  return new Promise((resolve) => {
    Papa.parse(GOOGLE_SHEET_CSV_URL, {
      download: true,
      header: true,
      complete: function (results) {
        resolve(results.data.length);
      },
    });
  });
}

/*****************************************
 * MAIN LOADER
 *****************************************/
async function loadDashboardStats() {
  try {
    console.log("📊 Loading Dashboard Stats...");

    const [takeoffs, builders, communities] = await Promise.all([
      fetchAirtableCount(TAKEOFF_TABLE),
fetchResidentialBuilders(),
      fetchAirtableCount(COMMUNITIES_TABLE),
    ]);

    document.getElementById("stat-active-takeoffs").textContent = takeoffs;
    document.getElementById("stat-builders").textContent = builders;
    document.getElementById("stat-communities").textContent = communities;

    const skuCount = await fetchSkuCount();
    document.getElementById("stat-skus").textContent = skuCount;

    console.log("✅ Dashboard Stats Updated");

  } catch (err) {
    console.error("❌ Error loading dashboard stats:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadDashboardStats);
