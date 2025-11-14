document.addEventListener("DOMContentLoaded", async () => {
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const TABLE_ID = "tblfSrIrImd28RpAD";

  const container = document.getElementById("login-history");
  if (!container) return;

  // Fetch all records with pagination
  async function fetchAllRecords() {
    const all = [];
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100`;
    while (url) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
      if (!res.ok) throw new Error(`Airtable error ${res.status}`);
      const data = await res.json();
      all.push(...(data.records || []));
      url = data.offset
        ? `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100&offset=${data.offset}`
        : null;
    }
    return all;
  }

  container.innerHTML = `<p class="text-gray-500 text-sm">Loading recent activity...</p>`;

  try {
  const records = await fetchAllRecords();

  // Build structured user list
  const users = [];

  for (const rec of records) {
    const f = rec.fields || {};

    const name = f["Full Name"] || "Unknown User";
    const email = f["Email"] || f["User Email"] || "";
    const type = f["Activity Type"] || "Login";

    // Parse login history safely
    let history = [];
    if (typeof f["Login History"] === "string" && f["Login History"].trim()) {
      try {
        history = JSON.parse(f["Login History"]);
      } catch (e) {
        history = [];
      }
    }

    // Only keep users who actually have history
    if (!history || history.length === 0) continue;

    users.push({ name, email, type, history });
  }

  // Group login events by DAY
  const dayGroups = {};

  for (const u of users) {
    for (const iso of u.history) {
      const d = new Date(iso);
      if (isNaN(d)) continue;

      // FORMAT: Friday, November 14, 2025
      const dayKey = d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      if (!dayGroups[dayKey]) dayGroups[dayKey] = [];

      dayGroups[dayKey].push({
        user: u.name,
        email: u.email,
        type: u.type,
        ts: d.getTime(),
        timeStr: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      });
    }
  }

  // Sort days newest → oldest
  const sortedDays = Object.keys(dayGroups).sort((a, b) => {
    const aTs = Math.max(...dayGroups[a].map(ev => ev.ts));
    const bTs = Math.max(...dayGroups[b].map(ev => ev.ts));
    return bTs - aTs;
  });

  // Build HTML
  let html = `
    <h3 class="text-sm font-semibold text-blue-600 mb-3"></h3>
    <div class="max-h-96 overflow-y-auto pr-2">
  `;

  for (const day of sortedDays) {
    html += `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 text-sm mb-2">${day}</h4>
    `;

    // Sort events newest → oldest within each day
    const events = dayGroups[day].sort((a, b) => b.ts - a.ts);

    let prevUser = null;

    for (const ev of events) {
      if (ev.user !== prevUser) {
        if (prevUser !== null) html += `</ul>`; // close previous list

        html += `<div><strong>${ev.user}</strong><ul class="list-disc ml-4">`;
      }

      html += `
        <li class="text-xs text-gray-600">
          ${ev.timeStr} —
          <span class="text-blue-600 font-medium">${ev.type}</span>
        </li>
      `;

      prevUser = ev.user;
    }

    html += `</ul></div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

} catch (err) {
  console.error("🔥 Unable to load activity timeline:", err);
  container.innerHTML = `<p class="text-red-500 text-sm">❌ Failed to load activity timeline.</p>`;
}

});
