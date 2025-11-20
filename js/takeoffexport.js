// ====================================================================
// 📦 TAKEOFF IMPORT SCRIPT — FULLY REWRITTEN 11/2025
// Supports: Plan + Elevation unique naming, revision logic,
// estimator lookup, JSON import, user activity logging.
// ====================================================================
import { fetchDropboxToken, uploadFileToDropbox } from "./dropbox.js";

// ===== CONFIG =====
const EAIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const EBASE_ID = "appnZNCcUAJCjGp7L";
const ETABLE_ID = "tblZpnyqHJeC1IaZq"; // Main Takeoffs table
const ESTIMATOR_TABLE_ID = "tbl1ymzV1CYldIGJU"; // Estimator table
const LOGIN_HISTORY_TABLE_ID = "tblfSrIrImd28RpAD"; // Activity table

const HEADER_ROW = 6; // Excel header row
const COLUMN_LIMIT = 15;

// ====================================================================
// 🔍 LOOKUP ESTIMATOR
// ====================================================================
async function fetchEstimatorRecordId(name) {
    if (!name) return null;

    console.log("🔎 Searching estimator table for:", name);
    const encoded = encodeURIComponent(`{Full Name}='${name.replace(/'/g, "\\'")}'`);

    const url = `https://api.airtable.com/v0/${EBASE_ID}/${ESTIMATOR_TABLE_ID}?filterByFormula=${encoded}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${EAIRTABLE_API_KEY}` } });

    if (!res.ok) {
        console.error("❌ Estimator lookup error:", await res.text());
        return null;
    }

    const data = await res.json();
    if (!data.records.length) {
        console.warn("⚠️ No matching estimator found:", name);
        return null;
    }

    console.log("🆔 Estimator Record ID:", data.records[0].id);
    return data.records[0].id;
}

// ====================================================================
// 🔢 REVISION LOGIC — GET NEXT REVISION NUMBER
// ====================================================================
async function getNextRevision(takeoffName, elevation) {
    console.log("🔍 Checking revisions for:", takeoffName, "| Elevations:", elevation);

    // Airtable formula checks BOTH fields
    const filter = encodeURIComponent(
        `AND({Takeoff Name} = "${takeoffName}", {Elevations} = "${elevation}")`
    );

    const url = `https://api.airtable.com/v0/${EBASE_ID}/${ETABLE_ID}?filterByFormula=${filter}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${EAIRTABLE_API_KEY}` }
    });

    const json = await res.json();

    if (!json.records || !json.records.length) {
        console.log("🆕 No existing matching takeoff — starting Revision = 1");
        return 1;
    }

    let max = 0;

    json.records.forEach(r => {
        const rev = Number(r.fields["Revision #"] || 0);
        if (rev > max) max = rev;
    });

    console.log("🔢 Next Revision # =", max + 1);
    return max + 1;
}


// ====================================================================
// 📝 LOG ACTIVITY — AUTO CREATE RECORD IF NEEDED
// ====================================================================
// ====================================================================
// 📝 SAFE & FIXED — LOG TAKEOFF IMPORT ACTIVITY
// ====================================================================
async function logTakeoffImportActivity(takeoffName, planName, elevation, nextRevision) {
    const apiKey = EAIRTABLE_API_KEY;
    const baseId = EBASE_ID;
    const tableId = LOGIN_HISTORY_TABLE_ID;

    console.log("🔍 ENTER logTakeoffImportActivity");
    console.log("📌 takeoffName:", takeoffName);
    console.log("📌 planName:", planName);
    console.log("📌 elevation:", elevation);
    console.log("📌 revision:", nextRevision);

    let userRecordId = localStorage.getItem("userRecordId");
    console.log("🧪 Stored userRecordId:", userRecordId);

    if (!userRecordId || userRecordId === "undefined") {
        console.warn("❌ No userRecordId — cannot log activity.");
        return;
    }

    // ------------------------------------------------------------
    // STEP 1 — GET USER RECORD
    // ------------------------------------------------------------
    const getUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${userRecordId}`;
    console.log("🔗 GET URL:", getUrl);

    const getResponse = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${apiKey}` }
    });

    console.log("📡 GET Status:", getResponse.status);
    const getJson = await getResponse.json();
    console.log("📦 GET JSON:", getJson);

    if (!getResponse.ok) {
        console.warn("❌ GET failed — aborting activity log.");
        return;
    }

    // ------------------------------------------------------------
    // STEP 2 — PARSE Login History
    // ------------------------------------------------------------
    let history = [];
    try {
        history = JSON.parse(getJson.fields["Login History"] || "[]");
        if (!Array.isArray(history)) history = [];
    } catch (err) {
        console.warn("⚠️ Bad Login History JSON — resetting.");
        history = [];
    }

    // ------------------------------------------------------------
    // STEP 3 — Append new activity entry
    // ------------------------------------------------------------
    const timestamp = new Date().toISOString();

    history.push({
        timestamp,
        type: "Takeoff Import",
        details: {
            takeoffName,
            plan: planName || "",
            elevation: elevation || "",
            revision: nextRevision || ""
        }
    });

    console.log("📝 Updated History:", history);

    // ------------------------------------------------------------
    // STEP 4 — SAFE PATCH (NO SYNCED FIELDS)
    // ------------------------------------------------------------
    const patchUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${userRecordId}`;
    console.log("🔗 PATCH URL:", patchUrl);

    // ONLY allowed writable fields
    const patchBody = {
        fields: {
            "Last Activity": timestamp,
            "Last Takeoff Imported": takeoffName,
            "Login History": JSON.stringify(history),
            "Activity Type": "Takeoff Import"
        }
    };

    console.log("📤 Final PATCH Payload:", patchBody);

    const patchResponse = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(patchBody)
    });

    console.log("📡 PATCH Status:", patchResponse.status);
    const patchJson = await patchResponse.json();
    console.log("📦 PATCH Response JSON:", patchJson);

    if (!patchResponse.ok) {
        console.error("❌ PATCH FAILED — Activity NOT logged");
        return;
    }

    console.log("✅ Activity logged successfully:", timestamp);
}

// ====================================================================
// 🎯 ROW FILTER
// ====================================================================
function isRowMeaningful(row) {
    const sku = row["SKU"];
    if (!sku || sku.toString().trim() === "") {
        console.log("⏭️ Skipping empty row (no SKU):", row);
        return false;
    }
    return true;
}

// ====================================================================
// 📄 MAIN LOGIC — WHEN FILE SELECTED
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("takeoff-import");
    if (!fileInput) {
        console.error("❌ Missing <input id='takeoff-import'>");
        return;
    }

    // ===========================
    // MULTIPLE FILE IMPORT HANDLER
    // ===========================
    fileInput.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        for (const file of files) {
            await processTakeoffFile(file);
        }

        alert("✅ All takeoffs imported successfully!");
    });
});

function scrapeElevation(raw) {
    if (!raw) return "A";

    const text = raw.toString().trim();

    // Extract first letter at start: C → "C 9 ft Ceiling"
    const match = text.match(/^[A-Z]/i);
    if (match) return match[0].toUpperCase();

    return "A";
}



// ======================================================
//  PROCESS ONE TAKEOFF FILE (REUSABLE FOR MULTIPLE FILES)
// ======================================================
async function processTakeoffFile(file) {
    console.log("📄 Importing:", file.name);

    // --------------------------------------------------------------
    // READ EXCEL FILE
    // --------------------------------------------------------------
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
window.lastSheet = sheet;   // <-- makes sheet accessible in the Console
console.log("🧪 Debug sheet saved to window.lastSheet");

    // --------------------------------------------------------------
    // EXTRACT ESTIMATOR
    // --------------------------------------------------------------
    let foundEstimatorValue = "";

    if (sheet["N14"]?.v) {
        foundEstimatorValue = sheet["N14"].v;
    } else {
        Object.keys(sheet).forEach(addr => {
            const cell = sheet[addr];
            if (cell?.v && typeof cell.v === "string") {
                if (cell.v.toLowerCase().includes("estim")) {
                    foundEstimatorValue = cell.v;
                }
            }
        });
    }

    console.log("📌 FINAL Estimator from sheet:", foundEstimatorValue);

    const estimatorId = await fetchEstimatorRecordId(foundEstimatorValue);

    // --------------------------------------------------------------
    // EXTRACT PLAN NAME
    // --------------------------------------------------------------
    const TAKEOFF_CELLS = ["M16", "L16", "M15", "C14"];
    let takeoffName = "";

    for (const cell of TAKEOFF_CELLS) {
        if (sheet[cell]?.v) {
            takeoffName = sheet[cell].v.toString().trim();
            break;
        }
        if (sheet[cell]?.w) {
            takeoffName = sheet[cell].w.toString().trim();
            break;
        }
    }

    console.log("📌 RAW PLAN NAME:", takeoffName);

    // --------------------------------------------------------------
    // EXTRACT ELEVATION
    // --------------------------------------------------------------
const ELEVATION_CELLS = ["L17", "M17", "K17", "L18"]; 
// --------------------------------------------------------------
// EXTRACT ELEVATION (Excel cell L17)
// --------------------------------------------------------------
// --------------------------------------------------------------
// EXTRACT ELEVATION EXACT (Excel cell L17)
// --------------------------------------------------------------
let elevation = "";

if (sheet["L17"]?.v) {
    elevation = sheet["L17"].v.toString().trim();
} else if (sheet["L17"]?.w) {
    elevation = sheet["L17"].w.toString().trim();
} else {
    console.warn("⚠️ Elevation not found in L17. Searching entire sheet…");

    for (const addr of Object.keys(sheet)) {
        const cell = sheet[addr];
        if (!cell?.v || typeof cell.v !== "string") continue;

        const text = cell.v.trim();

        // Match any elevation-like value
        if (
            text.includes("Ceiling") ||
            /^[A-Z]\s*\d/.test(text) ||
            /^Elevation/i.test(text)
        ) {
            elevation = text;
            console.log("🔍 Fallback elevation found:", addr, text);
            break;
        }
    }
}

console.log("📌 FINAL ELEVATION EXACT:", elevation);


// clean elevation into single letter

console.log("📌 CLEANED ELEVATION:", elevation);
console.log("📌 FINAL ELEVATION:", elevation);


    console.log("📌 FINAL ELEVATION:", elevation);

    // --------------------------------------------------------------
    // BUILD FINAL UNIQUE TAKEOFF NAME
    // --------------------------------------------------------------
    let finalTakeoffName = `${takeoffName} - ${elevation}`;
    console.log("📌 FINAL TAKEOFF NAME:", finalTakeoffName);

    // --------------------------------------------------------------
    // PARSE ROWS
    // --------------------------------------------------------------
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const headers = rawRows[HEADER_ROW];

    const parsedRows = rawRows
        .slice(HEADER_ROW + 1)
        .map((row) => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = row[i]; });
            return obj;
        })
        .filter(r => isRowMeaningful(r));

    console.log("📦 Meaningful rows:", parsedRows.length);

    // --------------------------------------------------------------
    // GET NEXT REVISION NUMBER
    // --------------------------------------------------------------
const revision = await getNextRevision(takeoffName, elevation);

    // --------------------------------------------------------------
    // UPLOAD TAKEOFF RECORD
    // --------------------------------------------------------------
// DEBUG: expose values to window for console inspection
window._lastElevation = elevation;
window._lastPayload = {
    "Takeoff Name": finalTakeoffName,
    "Estimator": estimatorId ? [estimatorId] : [],
    "Imported JSON": JSON.stringify(parsedRows),
    "Revision #": revision,
    "Elevations": elevation   // <- MUST be included so you can inspect it
};
window._lastUploadRow = {
    payload: window._lastPayload,
    plan: takeoffName,
    elevation,
    revision,
    file
};

// === ORIGINAL UPLOAD CALL ===
await uploadRow(
    {
        fields: window._lastPayload   // <-- Use debug payload
    },
    takeoffName,
    elevation,
    revision,
    file
);


    console.log(`✅ Finished importing: ${file.name}`);
}

// ====================================================================
// ▶ UPLOAD RECORD TO AIRTABLE
// ====================================================================
async function uploadRow(payload, takeoffName, elevation, revision, originalFile) {
    const url = `https://api.airtable.com/v0/${EBASE_ID}/${ETABLE_ID}`;

    // 1️⃣ Create the Airtable record first
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

    const record = await res.json();
    const recordId = record.id;
    console.log("✅ Airtable row created:", recordId);

    // 2️⃣ Upload original file to Dropbox
    const dropboxCreds = await fetchDropboxToken();
    if (!dropboxCreds) {
        console.error("❌ No Dropbox credentials available");
        return;
    }

    const publicUrl = await uploadFileToDropbox(
        originalFile,
        dropboxCreds.token,
        dropboxCreds
    );

    if (!publicUrl) {
        console.error("❌ Could not upload file to Dropbox");
        return;
    }

    console.log("📎 Dropbox File URL:", publicUrl);

    // 3️⃣ Patch Airtable record with attachment
    const attachPatchUrl = `https://api.airtable.com/v0/${EBASE_ID}/${ETABLE_ID}/${recordId}`;

    await fetch(attachPatchUrl, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${EAIRTABLE_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            fields: {
                "Takeoff Template": [
                    {
                        url: publicUrl,
                        filename: originalFile.name
                    }
                ]
            }
        })
    });

    console.log("📎 Attachment added to Airtable!");

    // 4️⃣ Log activity (no change)
    logTakeoffImportActivity(
        payload.fields["Takeoff Name"],
        takeoffName,
        elevation,
        revision
    ).catch(err => console.warn("⚠️ Activity logging failed:", err));
}

