console.clear();
console.log("📌 Recent Activity Script Loaded");

document.addEventListener("DOMContentLoaded", async () => {

  //-----------------------------------------------------
  // Airtable Config
  //-----------------------------------------------------
  const AIRTABLE_API_KEY =
    "patxrKdNvMqOO43x4.274bd66bb800bb57cd8b22fe56831958ac0e8d79666cc5e4496013246c33a2f3";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const TABLE_ID = "tblfSrIrImd28RpAD";

  const tableBody = document.getElementById("activity-body");
  const totalLabel = document.getElementById("total-activity");
  const paginationLabel = document.getElementById("activity-pagination");

  if (!tableBody) {
    console.error("❌ Missing #activity-body");
    return;
  }

  let activityEvents = [];

  //-----------------------------------------------------
  // Fetch the ENTIRE user table
  //-----------------------------------------------------
  async function fetchAllUsers() {
    let all = [];
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100`;

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });

      const json = await res.json();
      if (!json.records) break;

      all.push(...json.records);

      url = json.offset
        ? `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100&offset=${json.offset}`
        : null;
    }
    return all;
  }

  console.log("📡 Fetching all users...");
  const users = await fetchAllUsers();

  //-----------------------------------------------------
  // Parse Login History — NEW OBJECT SCHEMA
  //-----------------------------------------------------
  console.log("🔍 Parsing activity logs...");

  for (const u of users) {
    const f = u.fields;
    const name = f["Full Name"] || "Unknown User";
    const email = f["Email"] || "";

    let raw = f["Login History"];

    if (!raw) continue;

    let parsed = [];
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];
    } catch (e) {
      console.error("❌ Bad JSON for", name, raw);
      continue;
    }

    for (const ev of parsed) {
      if (!ev.timestamp) continue;

      const d = new Date(ev.timestamp);
      if (isNaN(d)) continue;

      activityEvents.push({
        user: name,
        email,
        action: ev.type || "Unknown",
        details: ev.details || ev.takeoffName || ev.newValue || "",
        ts: d.getTime(),
        d,
      });
    }
  }

  //-----------------------------------------------------
  // If empty — render "no activity"
  //-----------------------------------------------------
  if (activityEvents.length === 0) {
    console.warn("⚠ No activity found.");
    tableBody.innerHTML = `
      <tr><td colspan="5" class="py-4 text-center text-gray-500">No activity found.</td></tr>
    `;
    return;
  }

  //-----------------------------------------------------
  // Sort newest → oldest
  //-----------------------------------------------------
  activityEvents.sort((a, b) => b.ts - a.ts);

  //-----------------------------------------------------
  // Pagination Setup
  //-----------------------------------------------------
  let page = 1;
  const pageSize = 25;
  const totalPages = Math.ceil(activityEvents.length / pageSize);

  function renderPage() {
    tableBody.innerHTML = "";

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageEvents = activityEvents.slice(start, end);

    for (const ev of pageEvents) {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="py-3 px-3 flex items-center space-x-2">
          <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-bold">
            ${ev.user.charAt(0)}
          </div>
          <span>${ev.user}</span>
        </td>

        <td class="py-3 px-3 text-gray-800">
          ${buildSummary(ev)}
        </td>

        <td class="py-3 px-3">
          <span class="px-2 py-1 bg-gray-800 text-white text-xs rounded-md">
            ${ev.action.toUpperCase()}
          </span>
        </td>

        <td class="py-3 px-3 text-gray-600">${detectType(ev.action)}</td>

        <td class="py-3 px-3 text-right text-gray-500">
          ${ev.d.toLocaleString()}
        </td>
      `;

      tableBody.appendChild(tr);
    }

    totalLabel.textContent = `Total Records: ${activityEvents.length}`;
    paginationLabel.textContent = `${page} / ${totalPages}`;
  }

  //-----------------------------------------------------
  // Helper: Build User-Friendly Summary Text
  //-----------------------------------------------------
  function buildSummary(ev) {
    switch (ev.action) {
      case "Login":
        return `User '${ev.user}' logged in.`;
      case "Logout":
        return `User '${ev.user}' logged out.`;
      case "Takeoff Import":
        return `Imported takeoff '${ev.details}'`;
      case "Takeoff Update":
        return `Updated takeoff '${ev.details}'`;
      case "Plan Updated":
        return `Updated plan to '${ev.details}'`;
      case "Elevation Updated":
        return `Updated elevation to '${ev.details}'`;
      default:
        return ev.details || "Activity recorded.";
    }
  }

  //-----------------------------------------------------
  // Detect Type (UI Tag)
  //-----------------------------------------------------
  function detectType(action) {
    action = action.toLowerCase();
    if (action.includes("takeoff")) return "Takeoffs";
    if (action.includes("plan")) return "Plans";
    if (action.includes("elevation")) return "Elevations";
    if (action.includes("login") || action.includes("logout")) return "System";
    return "Other";
  }

  //-----------------------------------------------------
  // Pagination Controls
  //-----------------------------------------------------
  document.getElementById("activity-next")?.addEventListener("click", () => {
    if (page < totalPages) {
      page++;
      renderPage();
    }
  });

  renderPage();
});
