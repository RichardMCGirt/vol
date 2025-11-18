/**********************************************************
 *  manualcreate.js — FINAL PRODUCTION VERSION
 *  Handles:
 *   - Creating main takeoff record (Table A)
 *   - Saving header fields
 *   - Creating or updating JSON record (Table B)
 **********************************************************/

// ---------- CONFIG ----------
const mAPI_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const mBASE_ID = "appnZNCcUAJCjGp7L";

const mTABLE_MAIN = "tblZpnyqHJeC1IaZq";      // Table A
const mTABLE_JSON = "tblcG08fWPOesXDfC";       // Table B

const mFIELD_JSON = "Imported JSON";           // must be Long Text
const mFIELD_LINK = "Takeoff Link";            // must be a linked record to Table A



/**********************************************************
 *   UTIL — Get existing main record ID
 **********************************************************/
function getMainRecordId() {
    return localStorage.getItem("currentTakeoffId") || null;
}



/**********************************************************
 *   STEP 1 — Create new main record in Table A
 **********************************************************/
async function createMainRecord() {

    console.log("🆕 Creating new Takeoff in Table A…");

    const builder = document.getElementById("builder-select").value;
    const builderArray = builder ? [builder] : [];

    const payload = {
        fields: {
            "Takeoff Name": document.getElementById("nameInput").value || "Untitled Takeoff",
            "Type": document.getElementById("takeoff-type").value || "",
            "Builder": builderArray,
            "Plan name": document.getElementById("plan-select").value || "",
            "Elevation": document.getElementById("elevation-select").value || "",
            "Community Name": document.getElementById("community-select").value || ""
        }
    };

    const res = await fetch(`https://api.airtable.com/v0/${mBASE_ID}/${mTABLE_MAIN}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${mAPI_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok) {
        console.error("❌ Failed to create main record:", json);
        return null;
    }

    console.log("✅ Main Takeoff Created:", json.id);
    localStorage.setItem("currentTakeoffId", json.id);
    return json.id;
}




/**********************************************************
 *   STEP 2 — Patch header fields to Table A
 **********************************************************/
async function updateMainRecord(recordId) {

    const builder = document.getElementById("builder-select").value;
    const builderArray = builder ? [builder] : [];

    const payload = {
        fields: {
            "Takeoff Name": document.getElementById("nameInput").value || "",
            "Type": document.getElementById("takeoff-type").value || "",
            "Builder": builderArray,
            "Plan name": document.getElementById("plan-select").value || "",
            "Elevation": document.getElementById("elevation-select").value || "",
            "Community Name": document.getElementById("community-select").value || ""
        }
    };

    await fetch(`https://api.airtable.com/v0/${mBASE_ID}/${mTABLE_MAIN}/${recordId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${mAPI_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}




/**********************************************************
 *  STEP 3 — Collect JSON from UI
 **********************************************************/
function collectLineItemJSON() {
    const rows = [...document.querySelectorAll("#line-item-body tr")];

    return rows.map(row => ({
        SKU: row.querySelector(".sku-input")?.value || "",
        Description: row.querySelector(".desc-input")?.value || "",
        UOM: row.querySelector(".uom-input")?.value || "",
        "Material Type": row.querySelector(".mat-input")?.value || "",
        "Color Group": row.querySelector(".color-input")?.value || "",
        Vendor: row.querySelector(".vendor-input")?.value || "",
        Qty: Number(row.querySelector(".qty-input")?.value || 0),
        "Unit Cost": Number(row.querySelector(".cost-input")?.value || 0),
        "UOM Mult": Number(row.querySelector(".mult-input")?.value || 1),
        "Ext. Cost": Number(row.querySelector(".extcost-input")?.value || 0),
        "%": Number(row.querySelector(".percent-input")?.value || 0),
        Total: Number(row.querySelector(".total-input")?.value || 0)
    }));
}



/**********************************************************
 *  STEP 4 — Save JSON to Table B (create or patch)
 **********************************************************/
/**********************************************************
 *  STEP 4 — Save JSON to Table B (create or patch)
 **********************************************************/
async function saveJsonRecord(mainRecordId, jsonData) {

    const planName = document.getElementById("plan-select").value || "";

    // 1️⃣ Search if a JSON row already exists for this takeoff
    const findUrl =
        `https://api.airtable.com/v0/${mBASE_ID}/${mTABLE_JSON}?filterByFormula=` +
        encodeURIComponent(`{Takeoff Link}='${mainRecordId}'`);

    const findRes = await fetch(findUrl, {
        headers: { Authorization: `Bearer ${mAPI_KEY}` }
    });

    const findJson = await findRes.json();

    // If found → PATCH it
    if (findJson.records && findJson.records.length > 0) {

        const jsonRecordId = findJson.records[0].id;

        console.log("🔄 Updating existing JSON record:", jsonRecordId);

        const patchUrl = `https://api.airtable.com/v0/${mBASE_ID}/${mTABLE_JSON}/${jsonRecordId}`;

        await fetch(patchUrl, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${mAPI_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    "Imported JSON": JSON.stringify(jsonData),
                    "Plan Name": planName
                }
            })
        });

        return;
    }

    // Otherwise → CREATE a new JSON record
    console.log("🆕 Creating new JSON record linked to main record");

    const createUrl = `https://api.airtable.com/v0/${mBASE_ID}/${mTABLE_JSON}`;

    await fetch(createUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${mAPI_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            fields: {
                "Takeoff Link": [mainRecordId],
                "Imported JSON": JSON.stringify(jsonData),
                "Plan Name": planName
            }
        })
    });
}


/**********************************************************
 *  VALIDATE THAT STORED MAIN RECORD ID EXISTS
 *  If invalid → remove it so a new record will be created
 **********************************************************/
async function ensureValidMainRecordId() {
    let id = localStorage.getItem("currentTakeoffId");
    if (!id) return null;

    const url = `https://api.airtable.com/v0/${mBASE_ID}/${mTABLE_MAIN}/${id}`;

    const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${mAPI_KEY}` }
    });

    // If Airtable says "not found" or "unprocessable" → ID is invalid
    if (res.status === 404 || res.status === 422) {
        console.warn("⚠️ Stored ID is invalid — clearing and creating a new one.");
        localStorage.removeItem("currentTakeoffId");
        return null;
    }

    return id;
}


/**********************************************************
 *   MAIN SAVE — NOW BULLET-PROOF
 **********************************************************/
/**********************************************************
 *   MAIN SAVE — Bulletproof version
 **********************************************************/
async function saveManualTakeoff() {

    // 1️⃣ Validate stored ID
    let recordId = await ensureValidMainRecordId();

    // 2️⃣ If invalid or missing → create new
    if (!recordId) {
        console.log("🆕 No valid main record found — creating one now...");
        recordId = await createMainRecord();
        if (!recordId) {
            alert("❌ Error: Could not create main record.");
            return;
        }
        console.log("✅ New record created:", recordId);
        localStorage.setItem("currentTakeoffId", recordId);
    }

    // 3️⃣ Update main record fields
    await updateMainRecord(recordId);

    // 4️⃣ Get line items → JSON
    const jsonData = collectLineItemJSON();

    // 5️⃣ Patch or Create JSON record
    await saveJsonRecord(recordId, jsonData);

    // 6️⃣ Success
    showToast("Saved successfully!");
}





/**********************************************************
 *   UI TOAST
 **********************************************************/
function showToast(msg) {
    let toast = document.getElementById("manual-save-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "manual-save-toast";
        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.right = "20px";
        toast.style.background = "#333";
        toast.style.color = "#fff";
        toast.style.padding = "10px 14px";
        toast.style.borderRadius = "6px";
        toast.style.opacity = "0";
        toast.style.transition = "opacity .3s";
        document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.style.opacity = "1";
    setTimeout(() => toast.style.opacity = "0", 2000);
}



/**********************************************************
 *   BIND SAVE BUTTON
 **********************************************************/
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("manual-save-btn");
    if (btn) {
        btn.addEventListener("click", saveManualTakeoff);
        console.log("📌 manualcreate.js → Save button attached");
    } else {
        console.warn("⚠ No #manual-save-btn found.");
    }
});
