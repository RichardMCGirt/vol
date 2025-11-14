// ========== CONFIG ==========
const EAIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const EBASE_ID = "appnZNCcUAJCjGp7L";
const ETABLE_ID = "tblHmmBVDefWrN443"; // Line item table
const ESTIMATOR_TABLE_ID = "tbl1ymzV1CYldIGJU"; // Full Name table
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


// ========== MAIN IMPORT FUNCTION ==========
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("takeoff-import");

  if (!fileInput) {
    console.error("❌ Missing <input id='takeoff-import'>");
    return;
  }

  fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log("📂 File selected:", file.name);

  // ================= LOAD WORKBOOK =================
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    console.error("❌ No sheet found in workbook!");
    return;
  }

  // ================= SCAN FOR ESTIMATOR =================
  console.log("🔍 Scanning sheet for estimator name...");

  let foundEstimatorCell = null;
  let foundEstimatorValue = "";

  Object.keys(sheet).forEach(addr => {
    const cell = sheet[addr];
    if (!cell || !cell.v) return;

    if (typeof cell.v === "string") {
      const val = cell.v.toLowerCase();

      // You can add more last names or partial matches here
      if (val.includes("kornegay") || val.includes("heath")) {
        console.log("🎯 FOUND ESTIMATOR:", addr, "→", cell.v);
        foundEstimatorCell = addr;
        foundEstimatorValue = cell.v;
      }
    }
  });

  if (!foundEstimatorValue) {
    console.log("⚠️ No estimator found in sheet. Value = ''");
  } else {
    console.log("📌 Final Estimator:", foundEstimatorValue);
  }

  // ================= EXTRACT RAW ROWS =================
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ""
  });

  console.log("📄 Raw rows loaded:", rawRows.length);

  // ================= HEADER ROW =================
  const HEADER_ROW = 6;        // row 7 in Excel
  const COLUMN_LIMIT = 15;     // A–O columns

  const headers = rawRows[HEADER_ROW].slice(0, COLUMN_LIMIT);  
  console.log("🧩 Extracted Headers:", headers);

  // ================= PARSE DATA ROWS =================
  const parsedRows = rawRows
    .slice(HEADER_ROW + 1)       // rows after header
    .map((row, index) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      console.log(`🔎 Parsed Row ${index}:`, obj);
      return obj;
    })
    .filter(r => isRowMeaningful(r));  // skip empty rows

  // ================= UPLOAD =================
  for (const row of parsedRows) {
const estimatorId = await fetchEstimatorRecordId(foundEstimatorValue);
const mapped = mapRowToAirtable(row, estimatorId);
    console.log("📤 Uploading row:", mapped);
    await uploadRow(mapped);
  }

  alert("✅ Takeoff import complete!");
});

});


// ========== DETECT REAL DATA ROWS ==========
function isRowMeaningful(row) {
  const sku = row["SKU"];

  if (!sku || sku.toString().trim() === "") {
    console.log("⏭️ Skipping empty row (no SKU):", row);
    return false;
  }

  return true;
}




// ========== LOOKUP ESTIMATOR LINKED RECORD ==========
async function getEstimatorRecordId(name) {
  if (!name || name.trim() === "") {
    console.warn("⚠ No estimator name found");
    return null;
  }

  const url = `https://api.airtable.com/v0/${EBASE_ID}/${ESTIMATOR_TABLE_ID}?filterByFormula=${encodeURIComponent(
    `{Full Name}="${name}"`
  )}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${EAIRTABLE_API_KEY}` }
  });

  const json = await res.json();

  if (json.records && json.records.length > 0) {
    return json.records[0].id;
  }

  console.warn("⚠ No matching estimator found:", name);
  return null;
}
async function getTakeoffNameRecordId(name) {
  if (!name || name.trim() === "") return null;

  const url = `https://api.airtable.com/v0/${EBASE_ID}/tblZpnyqHJeC1IaZq?filterByFormula=${encodeURIComponent(
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
function mapRowToAirtable(row, estimatorId) {
  const fields = {
    "SKU": row["SKU"] || "",
   // "Name": row["Description"] || "",
    "UOM": row["UOM"] || "",
    "Quantity": Number(row["QTY"]) || 0,
    "Raw JSON": JSON.stringify(row)
  };

  // Only add estimator if we found a valid record ID
  if (estimatorId) {
    fields["Estimator"] = [estimatorId];
  }

  return { fields };
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
