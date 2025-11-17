// ========== CONFIG ==========
const EAIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const EBASE_ID = "appnZNCcUAJCjGp7L";
const ETABLE_ID = "tblcG08fWPOesXDfC"; // Line item table
const ESTIMATOR_TABLE_ID = "tbl1ymzV1CYldIGJU"; // Full Name table
// =====================
// CONFIG
// =====================
const HEADER_ROW = 6;        // Excel row 7 (0-based index)
const COLUMN_LIMIT = 15;     // Columns A–O

async function fetchEstimatorRecordId(name) {
  if (!name) return null;

  console.log("🔎 Searching estimator table for:", name);

  const encoded = encodeURIComponent(`{Full Name}='${name.replace(/'/g, "\\'")}'`);
  const url = `https://api.airtable.com/v0/${EBASE_ID}/tbl1ymzV1CYldIGJU?filterByFormula=${encoded}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${EAIRTABLE_API_KEY}` }
  });

  if (!res.ok) {
    console.error("❌ Estimator lookup error:", await res.text());
    return null;
  }

  const data = await res.json();

  if (data.records.length === 0) {
    console.warn("⚠️ No matching estimator found:", name);
    return null;
  }

  console.log("🆔 Correct Estimator Record ID:", data.records[0].id);
  return data.records[0].id;
}
async function findOrCreateTakeoffRecord(takeoffName) {
  return takeoffName; // always return the plain string
}




// ========== MAIN IMPORT FUNCTION ==========
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("takeoff-import");

  if (!fileInput) {
    console.error("❌ Missing <input id='takeoff-import'>");
    return;
  }

 



// ========== DETECT REAL DATA ROWS ==========
function isRowMeaningful(row) {
  const sku = row["SKU"];

  if (!sku || sku.toString().trim() === "") {
    console.log("⏭️ Skipping empty row (no SKU):", row);
    return false;
  }

  return true;
}

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log("📄 File selected:", file.name);

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Debug sheet scan for estimator name
  console.log("🔍 Scanning sheet for estimator...");
  Object.keys(sheet).forEach(addr => {
    const cell = sheet[addr];
    if (cell?.v && typeof cell.v === "string") {
      if (cell.v.toLowerCase().includes("kornegay") || cell.v.toLowerCase().includes("estim")) {
        console.log("🎯 FOUND POSSIBLE ESTIMATOR:", addr, "→", cell.v);
      }
    }
  });

  // ============================
  // EXTRACT ESTIMATOR (from N14)
  // ============================
let foundEstimatorValue = "";

// Prefer N14
if (sheet["N14"]?.v) {
  foundEstimatorValue = sheet["N14"].v;
} else {
  // Auto-scan — use the cell you FOUND (L20)
  Object.keys(sheet).forEach(addr => {
    const cell = sheet[addr];
    if (cell?.v && typeof cell.v === "string") {
      if (cell.v.toLowerCase().includes("kornegay")) {
        console.log("🎯 Auto-selected estimator cell:", addr, "→", cell.v);
        foundEstimatorValue = cell.v;
      }
    }
  });
}

console.log("📌 FINAL Estimator from sheet:", foundEstimatorValue);


  console.log("📌 Estimator from sheet:", foundEstimatorValue);

  const estimatorId = await fetchEstimatorRecordId(foundEstimatorValue);
// 🆔 Estimator Record ID confirmed
console.log("🆔 Estimator Record ID:", estimatorId);

//--------------------------------------
// Extract TAKEOFF NAME (C14) — merged + rich text safe
//--------------------------------------
//--------------------------------------
// EXTRACT TAKEOFF NAME (Plan Name)
// Your sheet puts it in M16
//--------------------------------------
let takeoffName = "";

// Preferred cell for TAKEOFF NAME (M16)
const TAKEOFF_CELLS = ["M16", "L16", "M15", "C14"];  // fallback list

console.log("🔎 DEBUG START — Checking Takeoff Name cells…");

// 1️⃣ Try known cells first
for (const cell of TAKEOFF_CELLS) {
  const c = sheet[cell];
  if (!c) {
    console.log(`⚪ ${cell} is empty or undefined`);
    continue;
  }

  console.log(`🔍 Checking ${cell}:`, c);

  if (c.v) {
    takeoffName = c.v.toString().trim();
    console.log(`🎯 TAKEOFF NAME found at ${cell}:`, takeoffName);
    break;
  }

  if (c.w) {
    takeoffName = c.w.toString().trim();
    console.log(`🎯 TAKEOFF NAME (rich text) found at ${cell}:`, takeoffName);
    break;
  }
}

// 2️⃣ Check merged cells if still empty
if (!takeoffName && sheet["!merges"]) {
  console.log("🟦 Checking merged cells…");

  sheet["!merges"].forEach(m => {
    // M16 = row 15 (0-based 15), col 12 (0-based 12)
    const TARGET_ROW = 15;
    const TARGET_COL = 12;

    if (m.s.r <= TARGET_ROW && m.e.r >= TARGET_ROW &&
        m.s.c <= TARGET_COL && m.e.c >= TARGET_COL) {

      const topLeft = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
      const mergedCell = sheet[topLeft];

      if (mergedCell?.v) {
        takeoffName = mergedCell.v.toString().trim();
        console.log(`🔷 TAKEOFF NAME from merged top-left ${topLeft}:`, takeoffName);
      } else if (mergedCell?.w) {
        takeoffName = mergedCell.w.toString().trim();
        console.log(`🔷 TAKEOFF NAME (rich) from merged top-left ${topLeft}:`, takeoffName);
      }
    }
  });
}

// 3️⃣ Last-resort search anywhere for the text "The Berkley"
if (!takeoffName) {
  console.log("🟨 Final fallback: scanning sheet for plan name…");

  Object.keys(sheet).forEach(addr => {
    const cell = sheet[addr];
    if (!cell || !cell.v) return;

    const value = cell.v.toString().trim();

    // Match patterns like plan names
    if (/^[A-Za-z ]{3,50}$/.test(value)) {
      if (value.length > 3) {
        console.log(`💡 Fallback matched at ${addr}:`, value);
        takeoffName = value;
      }
    }
  });
}

console.log("📌 FINAL TAKEOFF NAME:", takeoffName);



  // ============================
  // PARSE TABLE HEADERS
  // ============================
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  console.log("📄 Raw rows loaded:", rawRows.length);

  const headers = rawRows[HEADER_ROW];
  console.log("🧩 Extracted Headers:", headers);

  // ============================
  // PARSE DATA ROWS
  // ============================
  const parsedRows = rawRows
    .slice(HEADER_ROW + 1)
    .map((row, index) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      console.log(`🔎 Parsed Row ${index}:`, obj);
      return obj;
    })
    .filter(r => isRowMeaningful(r));

  console.log("📦 Meaningful rows:", parsedRows.length);

//--------------------------------------
// CREATE OR FIND TAKEOFF NAME RECORD
//--------------------------------------
fields["Takeoff Name"] = takeoffName;

//--------------------------------------
// UPLOAD FINAL JSON RECORD
//--------------------------------------
await uploadRow({
  fields: {
"Plan Name": takeoffName,
    "Estimator": estimatorId ? [estimatorId] : [],        // ⭐ MUST BE ARRAY
    "Imported JSON": JSON.stringify(parsedRows)           // ⭐ All SKUs in one record
  }
});
  alert("✅ Takeoff import complete!");
});
});


async function fetchTakeoffNameId(takeoffName) {
  if (!takeoffName) return null;

  // Escape single quotes for Airtable
  const safeValue = takeoffName.replace(/'/g, "\\'");
  const filter = encodeURIComponent(`{Takeoff Name}='${safeValue}'`);

  const url = `https://api.airtable.com/v0/appnZNCcUAJCjGp7L/tblcG08fWPOesXDfC?filterByFormula=${filter}`;

  console.log("🔎 Searching Takeoff Name:", takeoffName, "→", url);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${EAIRTABLE_API_KEY}`
    }
  });

  const data = await res.json();

  if (!data.records?.length) {
    console.warn("⚠️ No matching Takeoff Name found in Airtable:", takeoffName);
    return null;
  }

  console.log("🆔 Found Takeoff Name ID:", data.records[0].id);
  return data.records[0].id;
}


// ========== LOOKUP ESTIMATOR LINKED RECORD ==========
async function fetchEstimatorRecordId(name) {
  if (!name) return null;

  console.log("🔎 Searching estimator table for:", name);

  const encoded = encodeURIComponent(`{Full Name}='${name.replace(/'/g, "\\'")}'`);
  const url = `https://api.airtable.com/v0/${EBASE_ID}/tbl1ymzV1CYldIGJU?filterByFormula=${encoded}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${EAIRTABLE_API_KEY}` }
  });

  const data = await res.json();
  if (!data.records.length) return null;

  console.log("🆔 Correct Estimator Record ID:", data.records[0].id);
  return data.records[0].id;
}

async function getTakeoffNameRecordId(name) {
  if (!name || name.trim() === "") return null;

  const url = `https://api.airtable.com/v0/${EBASE_ID}/tblcG08fWPOesXDfC?filterByFormula=${encodeURIComponent(
    `{Takeoff Name}="${name}"`
  )}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${EAIRTABLE_API_KEY}` }
  });

  const json = await res.json();

  if (json.records && json.records.length > 0) {
    return json.records[0].id;
  }

  console.warn("⚠ No matching linked Name record for:", name);
  return null;
}


// ========== MAP XLSX ROW → AIRTABLE RECORD ==========
async function mapRowToAirtable(row, estimatorId) {
  const takeoffName = row["Description"];   // The Name to link to

  const takeoffId = await findOrCreateTakeoffRecord(takeoffName);

  return {
    fields: {
"Name": takeoffName,
      "SKU": row["SKU"] || "",
      "UOM": row["UOM"] || "",
      "Quantity": row["QTY"] || 0,
      "Estimator Name": estimatorId ? [estimatorId] : [],
      "Raw JSON": JSON.stringify(row)
    }
  };
}

// ========== UPLOAD TO AIRTABLE ==========
async function uploadRow(payload) {
  const url = `https://api.airtable.com/v0/${EBASE_ID}/${ETABLE_ID}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EAIRTABLE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error("❌ Airtable Upload Error:", await res.text());
    return;
  }

  console.log("✅ Row uploaded successfully");
}
