// ================================
//  ACTIVITY LOGGER (Option B)
//  Stores structured activity:
//  { timestamp, type, details }
// ================================
import { EAIRTABLE_API_KEY, EBASE_ID, LOGIN_HISTORY_TABLE_ID } 
    from "./config.js";

export async function logActivity(activityType, details = "") {
    const apiKey = EAIRTABLE_API_KEY;
    const baseId = EBASE_ID;
    const tableId = LOGIN_HISTORY_TABLE_ID;

    console.log("🔍 ENTER logActivity:", activityType, details);

    let userRecordId = localStorage.getItem("userRecordId");
    let userEmail = localStorage.getItem("loggedInUser");

    console.log("📌 userRecordId:", userRecordId);
    console.log("📌 userEmail:", userEmail);

    if (!userRecordId) {
        console.warn("❌ No userRecordId — cannot log activity.");
        return;
    }

    const timestamp = new Date().toISOString();
    let history = [];

    // STEP 1 — Fetch current user record
    const getUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${userRecordId}`;
    console.log("🔗 GET URL:", getUrl);

    const getRes = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${apiKey}` }
    });

    console.log("📡 GET STATUS:", getRes.status);

    if (!getRes.ok) {
        console.warn("❌ GET failed — cannot log activity.");
        return;
    }

    const getJson = await getRes.json();
    console.log("📦 GET JSON:", getJson);

    // STEP 2 — Read "Login History"
    try {
        const rawHistory = JSON.parse(getJson.fields["Login History"] || "[]");

        // Backward compatibility: convert old timestamp-only entries to objects
        history = rawHistory.map(ev => {
            if (typeof ev === "string") {
                return { timestamp: ev, type: "Login", details: "" };
            }
            return ev;
        });

    } catch {
        history = [];
    }

    // STEP 3 — Add new structured activity object
    const newEntry = {
        timestamp,
        type: activityType,   // e.g., "Login" or "Takeoff Import"
        details: details      // extra info (e.g., takeoff name)
    };

    history.push(newEntry);

    console.log("📌 New Activity Entry:", newEntry);
    console.log("📚 Updated History Array:", history);

    // STEP 4 — PATCH updated history
    const patchUrl =
        `https://api.airtable.com/v0/${baseId}/${tableId}/${userRecordId}`;

    const patchBody = {
        fields: {
            "Last Activity": timestamp,
            "Activity Type": activityType,
            "Login History": JSON.stringify(history)
        }
    };

    console.log("📤 PATCH Payload:", patchBody);

    const patchRes = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(patchBody)
    });

    console.log("📡 PATCH STATUS:", patchRes.status);
    const patchJson = await patchRes.json();
    console.log("📦 PATCH JSON:", patchJson);

    if (!patchRes.ok) {
        console.warn("❌ PATCH failed — activity NOT saved.");
        return;
    }

    console.log("✅ Activity logged successfully:", newEntry);
    await softRefresh();

}
async function softRefresh() {
    console.log("🔄 Soft refresh triggered…");
    await populateTakeoffTable();
}
