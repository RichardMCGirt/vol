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
    console.log("🧪 fetchEstimatorRecordId received:", name);
    if (!name) {
        console.warn("⚠️ No estimator name — returning null");
        return null;
    }
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
async function getNextRevision(planName, elevation) {
    console.log("🔍 Checking revisions for:", planName, elevation);

    const filter = encodeURIComponent(
        `AND({Takeoff Name} = "${planName} - ${elevation}", {Elevations} = "${elevation}")`
    );

    const url = `https://api.airtable.com/v0/${EBASE_ID}/${ETABLE_ID}?filterByFormula=${filter}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${EAIRTABLE_API_KEY}` } });
    const json = await res.json();

    if (!json.records?.length) return 1;

    return Math.max(
        ...json.records.map(r => Number(r.fields["Revision #"] || 0))
    ) + 1;
}
// ====================================================================
// 📝 SAFE & FIXED — LOG TAKEOFF IMPORT ACTIVITY
// ====================================================================
async function logTakeoffImportActivity(takeoffName, elevation, nextRevision) {
    const apiKey = EAIRTABLE_API_KEY;
    const baseId = EBASE_ID;
    const tableId = LOGIN_HISTORY_TABLE_ID;

    console.log("🔍 ENTER logTakeoffImportActivity");
    console.log("📌 takeoffName:", takeoffName);
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
        type: "Takeoff Imported",
        details: {
            takeoffName,
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
function normalizeBuilderName(name) {
    return name
        ?.toString()
        .trim()
        .replace(/[-‐-‒–—]/g, "-") // normalize all dash types to normal hyphen
        .replace(/\s+/g, " ");     // collapse double spaces
}

// ====================================================================
// 🔍 LOOKUP BUILDER
// ====================================================================
async function fetchBuilderRecordId(name) {
    console.log("🔍 Searching Airtable for EXACT NAME:", JSON.stringify(name));

    console.log("🧪 fetchBuilderRecordId received:", name);
    if (!name) return null;

    const encoded = encodeURIComponent(`{Client Name}='${name.replace(/'/g, "\\'")}'`);

    // 👇 Using the correct Builder table ID
    const url = `https://api.airtable.com/v0/${EBASE_ID}/tblDkASnuImCKBQyO?filterByFormula=${encoded}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${EAIRTABLE_API_KEY}`
        }
    });

    if (!res.ok) {
        console.error("❌ Builder lookup error:", await res.text());
        return null;
    }

    const data = await res.json();
    if (!data.records.length) {
        console.warn("⚠️ No matching builder found:", name);
        return null;
    }
name = normalizeBuilderName(name);

    console.log("🆔 Builder Record ID:", data.records[0].id);
    return data.records[0].id;
}

// ======================================================
//  PROCESS ONE TAKEOFF FILE (REUSABLE FOR MULTIPLE FILES)
// ======================================================
async function processTakeoffFile(file) {
    console.log("📄 Importing:", file.name);


    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Make sheet available for debugging
    window.lastSheet = sheet;

    // ------------------------------
    // Smart label-based extraction
    // ------------------------------
function getValueNextToLabel(sheet, labelText) {
    const target = labelText.trim().toLowerCase();
    const keys = Object.keys(sheet);

    for (const addr of keys) {
        const cell = sheet[addr];
        if (!cell?.v) continue;

        // Raw cell value (exact Excel content)
        console.log("🔍 Cell Check:", { addr, value: cell.v });

        const cellText = cell.v.toString().trim().toLowerCase();

        // Check match
        if (cellText === target) {
            console.log("🎯 MATCHED LABEL:", cell.v, "at", addr);

            // Find the next column
            const match = addr.match(/^([A-Z]+)(\d+)$/i);
            if (!match) return "";

            let col = match[1];
            const row = parseInt(match[2]);

            // Move to next column (handles AA → AB, etc.)
            let nextCol = XLSX.utils.encode_col(
                XLSX.utils.decode_col(col) + 1
            );
            let nextAddr = nextCol + row;

            const nextValue = sheet[nextAddr]?.v?.toString().trim() || "";

            console.log("➡️ VALUE NEXT TO LABEL:", {
                nextCell: nextAddr,
                value: nextValue
            });

            return nextValue;
        }
    }

    console.log("⚠️ LABEL NOT FOUND:", labelText);
    return "";
}



    // Extract header fields
// Extract header fields
const planName = getValueNextToLabel(sheet, "Plan Name:");
const elevation = getValueNextToLabel(sheet, "Elevation:");
const materialType = getValueNextToLabel(sheet, "Material Type:");
const estimatorName = getValueNextToLabel(sheet, "Estimator:");
let builderName = getValueNextToLabel(sheet, "Builder:");

console.log("📌 BUILDER:", builderName);
builderName = normalizeBuilderName(builderName);
console.log("📌 Normalized Builder:", builderName);
console.log("📌 Raw Builder from Excel:", builderName);

console.log("📌 RAW EXCEL ESTIMATOR VALUE:", estimatorName);
console.log("📌 FINAL EXTRACTED ESTIMATOR:", estimatorName);
console.log("🔍 Calling fetchEstimatorRecordId with:", estimatorName);

console.log("📌 PLAN NAME:", planName);
console.log("📌 ELEVATION:", elevation);
console.log("📌 MATERIAL TYPE:", materialType);
console.log("📌 ESTIMATOR NAME:", estimatorName);


    // --------------------------------------------------------------
    // Extract estimator record ID for the linked field
    // --------------------------------------------------------------
    const estimatorId = await fetchEstimatorRecordId(estimatorName);
const builderId = await fetchBuilderRecordId(builderName);
console.log("🔗 Builder ID:", builderId);


    // --------------------------------------------------------------
    // Extract spreadsheet rows (SKUs)
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
    // Get next revision
    // --------------------------------------------------------------
const revision = await getNextRevision(planName, elevation);

    // --------------------------------------------------------------
    // Build payload
    // --------------------------------------------------------------
const payload = {
    fields: {
        "Takeoff Name": `${planName} - ${elevation}`,
        "Elevations": elevation,
        "Material Type": materialType,

        // ✔ Estimator linked record
        "Estimator": estimatorId ? [estimatorId] : [],

        // ✔ Builder linked if found
        "Builder": builderId ? [builderId] : [],

        // ✔ Builder2 fallback if NOT linked
        "Builder2": builderId ? "" : (builderName || ""),

        "Revision #": revision,
        "Imported JSON": JSON.stringify(parsedRows)
    }
};



    console.log("📤 FINAL PAYLOAD:", payload);

    // --------------------------------------------------------------
    // Upload to Airtable + Dropbox + log
    // --------------------------------------------------------------
await uploadRow(
    payload,
planName,
    elevation,                    // correct elevation
    revision,                     // correct revision number
    file                          // correct original file
);
}
