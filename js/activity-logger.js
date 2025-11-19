//----------------------------------------------
// ⭐ UNIVERSAL ACTIVITY LOGGER
// Stores activity objects inside Login History
//----------------------------------------------

export async function logActivity(eventData = {}) {
  try {
    const userRecordId = localStorage.getItem("userRecordId");
    const userName = localStorage.getItem("loggedInUserName") || "";
    const userEmail = localStorage.getItem("loggedInUser") || "";

    if (!userRecordId) {
      console.warn("⚠ Cannot log activity — no userRecordId found in localStorage");
      return;
    }

    // Airtable config
    const AIRTABLE_API_KEY = "patxrKdNvMqOO43x4.274bd66bb800bb57cd8b22fe56831958ac0e8d79666cc5e4496013246c33a2f3";
    const BASE_ID = "appnZNCcUAJCjGp7L";
    const TABLE_ID = "tblfSrIrImd28RpAD";

    //-----------------------------------------------------
    // 🔹 Build new activity event object
    //-----------------------------------------------------
    const timestamp = new Date().toISOString();

    const activityEvent = {
      type: eventData.type || "Unknown",
      timestamp,
      user: userName,
      email: userEmail,
      details: eventData.details || "",
      takeoffName: eventData.takeoffName || "",
      builder: eventData.builder || "",
      community: eventData.community || "",
      newValue: eventData.newValue || "",
      lineItems: eventData.lineItems || null
    };

    //-----------------------------------------------------
    // 1. Read existing Login History
    //-----------------------------------------------------
    const fetchURL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${userRecordId}`;
    const res = await fetch(fetchURL, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    const data = await res.json();
    let history = [];

    try {
      if (data.fields["Login History"]) {
        history = JSON.parse(data.fields["Login History"]);
        if (!Array.isArray(history)) history = [];
      }
    } catch (e) {
      console.error("❌ Failed parsing existing Login History:", e);
      history = [];
    }

    //-----------------------------------------------------
    // 2. Add new event to array
    //-----------------------------------------------------
    history.push(activityEvent);

    //-----------------------------------------------------
    // 3. PATCH back to Airtable
    //-----------------------------------------------------
    const patchURL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${userRecordId}`;

    await fetch(patchURL, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          "Login History": JSON.stringify(history)
        }
      })
    });

    console.log("📝 Activity Logged:", activityEvent);

  } catch (err) {
    console.error("❌ logActivity ERROR:", err);
  }
}
