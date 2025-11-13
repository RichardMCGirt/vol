// ========== CONFIG ==========
const EAIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const EBASE_ID = "appnZNCcUAJCjGp7L";
const ETABLE_ID = "tblHmmBVDefWrN443";   // Line item table

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

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    const firstSheet = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheet];

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    console.log("📄 Parsed XLSB rows:", rows);

    for (const row of rows) {
      const mapped = mapRowToAirtable(row);

      console.log("📤 Uploading row:", mapped);

      await uploadRow(mapped);
    }

    alert("✅ Takeoff import complete!");
  });
});


// ========== MAP XLSB ROW → AIRTABLE FIELDS ==========
function mapRowToAirtable(row) {
  return {
    fields: {
      "Name": row["Takeoff Name"] || "",
      "Estimator Name": row["Estimator"] || "",
      "Email (from Estimator Name)": row["Estimator Email"] || "",
      "Plan Name": row["Plan"] || "",
      "SKU": row["SKU"] || "",
      "UOM": row["UOM"] || "",
      "Unit cost": parseFloat(row["Unit Cost"]) || 0,
      "Quantity": parseFloat(row["Qty"]) || 0,
      "Extended Cost": parseFloat(row["Extended"]) || 0,
      "Margin": parseFloat(row["Margin"]) || 0,
      "Total cost": parseFloat(row["Total Cost"]) || 0,
      "Color Group": row["Color"] || "",
      "Vendor Name": row["Vendor"] || "",

      // OPTIONAL BUT HIGHLY RECOMMENDED
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

  console.log("✅ Row uploaded");
}
