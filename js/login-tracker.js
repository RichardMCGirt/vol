document.addEventListener("DOMContentLoaded", async () => {
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const TABLE_ID = "tbl1ymzV1CYldIGJU";

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

    const events = [];
    for (const rec of records) {
      const f = rec.fields || {};
      // Parse login history JSON
      let history = [];
      if (typeof f["Login History"] === "string" && f["Login History"].trim()) {
        try {
          history = JSON.parse(f["Login History"]);
        } catch {
          history = [];
        }
      }
      if (!Array.isArray(history) || history.length === 0) continue; // skip users like Jeff Burke

      const name = f["Full Name"] || "Unknown User";
      const type = f["Activity Type"] || "Login"; // default to "Login" for now

      for (const iso of history) {
        const d = new Date(iso);
        if (!isNaN(d)) {
          events.push({ ts: d.getTime(), iso, name, type });
        }
      }
    }

    // Sort by latest first
    events.sort((a, b) => b.ts - a.ts);

    // Render timeline
    if (events.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-sm">No activity recorded yet.</p>`;
      return;
    }

    let html = `<h3 class="text-sm font-semibold text-blue-600 mb-3"></h3>`;
    html += `<div class="max-h-96 overflow-y-auto pr-2">`;

    let prevEmail = null;
    let openBlock = false;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      // Group consecutive events from same user
      if (ev.email !== prevEmail) {
        if (openBlock) html += `</ul></div>`;
        html += `
          <div class="border-b border-gray-200 pb-2 mb-3">
            <h4 class="font-medium text-gray-800 text-sm">${ev.name}</h4>
            <ul class="list-disc ml-4">
        `;
        openBlock = true;
      }

      const d = new Date(ev.iso);
      const formattedTime = d.toLocaleString();
      html += `<li class="text-xs text-gray-600">${formattedTime} — <span class="text-blue-600 font-medium">${ev.type}</span></li>`;

      prevEmail = ev.email;
    }

    if (openBlock) html += `</ul></div>`;
    html += `</div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("🔥 Unable to load activity timeline:", err);
    container.innerHTML = `<p class="text-red-500 text-sm">❌ Failed to load activity timeline.</p>`;
  }
});
