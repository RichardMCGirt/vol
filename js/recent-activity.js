document.addEventListener("DOMContentLoaded", async () => {

  console.log("📌 Recent Activity Script Loaded");

  // Airtable Config
  const AIRTABLE_API_KEY = "patxrKdNvMqOO43x4.274bd66bb800bb57cd8b22fe56831958ac0e8d79666cc5e4496013246c33a2f3";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const TABLE_ID = "tblfSrIrImd28RpAD";

  let activityEvents = [];

  const tableBody = document.getElementById("activity-body");

  if (!tableBody) {
    console.error("❌ Could NOT find #activity-body in HTML");
    return;
  }

  console.log("✅ Found #activity-body");

  // ---------------------------
  // Fetch ALL users from Airtable
  // ---------------------------
  async function fetchAllUsers() {
    console.log("📡 Fetching Airtable users...");
    let all = [];
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100`;

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
      });

      const json = await res.json();

      if (!json.records) {
        console.error("❌ Airtable returned NO RECORDS:", json);
        break;
      }

      all.push(...json.records);

      url = json.offset
        ? `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100&offset=${json.offset}`
        : null;
    }

    console.log(`🎉 Total users fetched: ${all.length}`);
    return all;
  }

  const users = await fetchAllUsers();

  if (users.length === 0) {
    console.error("❌ NO USERS FETCHED.");
    return;
  }

  // ---------------------------
  // Parse Login History Only
  // ---------------------------
  console.log("🔍 Parsing login history…");

  for (const u of users) {
    const f = u.fields;

    const name = f["Full Name"] || "Unknown User";
    const email = f["Email"] || "";

    let raw = f["Login History"];

    if (!raw) continue;

    console.log("📄 RAW LOGIN HISTORY:", raw);

    try {
      const json = JSON.parse(raw);

      console.log("📦 PARSED LOGIN JSON:", json);

      if (Array.isArray(json)) {
        const userEvents = json.map(ts => ({
          user: name,
          email,
          action: "Login",
          details: "",
          type: "System",
          ts: new Date(ts).getTime(),
          d: new Date(ts)
        }));

        activityEvents.push(...userEvents);
      }

    } catch (e) {
      console.error("❌ JSON Parse Error:", e);
      continue;
    }
  }

  console.log("🧾 FINAL activityEvents:", activityEvents);

  // ---------------------------
  // If empty → show message
  // ---------------------------
  if (activityEvents.length === 0) {
    console.error("❌ NO EVENTS TO DISPLAY — UI will be empty.");
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-gray-500">No activity found.</td>
      </tr>`;
    return;
  }

  // Sort newest first
  activityEvents.sort((a, b) => b.ts - a.ts);

  // ---------------------------
  // Render UI
  // ---------------------------
  tableBody.innerHTML = "";

  for (const ev of activityEvents) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="py-3 px-3">${ev.user}</td>
      <td class="py-3 px-3">${ev.details || ""}</td>
      <td class="py-3 px-3">${ev.action}</td>
      <td class="py-3 px-3">System</td>
      <td class="py-3 px-3 text-right text-gray-500">${ev.d.toLocaleString()}</td>
    `;

    tableBody.appendChild(tr);
  }

  console.log("✅ UI Render Complete");
});
