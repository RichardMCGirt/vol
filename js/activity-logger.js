// ===============================
// UNIVERSAL ACTIVITY LOGGER
// Stores activity inside the user's "Login History" JSON field
// Table: tblfSrIrImd28RpAD
// ===============================

// 🔑 Your Users Base
const USERS_BASE = "appnZNCcUAJCjGp7L";   // stays the same unless you tell me otherwise
const USERS_TABLE = "tblfSrIrImd28RpAD";  // ✅ updated
const USERS_KEY = "patxrKdNvMqOO43x4.274bd66bb800bb57cd8b22fe56831958ac0e8d79666cc5e4496013246c33a2f3"; // Your key

// Fetch Airtable record for logged-in user
async function getUserRecord(email) {
    const formula = encodeURIComponent(`{Email} = "${email}"`);
    const url = `https://api.airtable.com/v0/${USERS_BASE}/${USERS_TABLE}?filterByFormula=${formula}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${USERS_KEY}` }
    });

    const json = await res.json();
    return json.records?.[0] || null;
}

// Append an event into Login History JSON
async function trackActivity(action, details = "") {
    const email = localStorage.getItem("loggedInEmail");
    if (!email) {
        console.warn("⚠ No logged in user found in localStorage.");
        return;
    }

    // 1. Get Airtable user row
    const userRecord = await getUserRecord(email);
    if (!userRecord) {
        console.error("❌ Airtable user not found for:", email);
        return;
    }

    // 2. Load existing JSON or empty
    let history = [];
    try {
        history = JSON.parse(userRecord.fields["Login History"] || "[]");
    } catch {
        history = [];
    }

    // 3. Create event
    const event = {
        action,
        details,
        timestamp: new Date().toISOString()
    };

    history.push(event);

    // 4. Save JSON back to Airtable
    await fetch(
        `https://api.airtable.com/v0/${USERS_BASE}/${USERS_TABLE}/${userRecord.id}`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${USERS_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    "Login History": JSON.stringify(history)
                }
            })
        }
    );

    console.log("⭐ Activity Saved:", event);
}
