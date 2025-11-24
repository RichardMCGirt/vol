document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔵 login-tracker.js loaded");

  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const TABLE_ID = "tblfSrIrImd28RpAD";

  const container = document.getElementById("login-history");
  if (!container) {
    console.warn("⚠️ login-history div missing!");
    return;
  }

  container.innerHTML = `<p class="text-gray-500 text-sm">Loading recent activity...</p>`;

  // -----------------------------
  // Fetch all records WITH LOGS
  // -----------------------------
  async function fetchAllRecords() {
    console.log("📡 Fetching Airtable Login Records…");

    const all = [];
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100`;

    while (url) {
      console.log("➡️ Fetching:", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
      });

      console.log("📥 Response status:", res.status);

      if (!res.ok) {
        console.error("❌ Airtable error:", await res.text());
        throw new Error(`Airtable error ${res.status}`);
      }

      const data = await res.json();
      console.log("📦 Batch loaded:", data.records?.length, "records");

      all.push(...(data.records || []));

      // Check for next page
      if (data.offset) {
        console.log("🔁 Next page offset:", data.offset);
        url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100&offset=${data.offset}`;
      } else {
        url = null;
      }
    }

    console.log("✅ Total records loaded:", all.length);
    return all;
  }

  try {
    const records = await fetchAllRecords();

    console.log("🔍 Raw Airtable Records:", records);

    // -----------------------------
    // Build user list with logs
    // -----------------------------
    const users = [];

    for (const rec of records) {
      console.log("➡️ Processing record:", rec);

      const f = rec.fields || {};

      const name = f["Full Name"];
      const email = f["email"] || f["User Email"];
      const type = f["Activity Type"];

 // ----------------------------
// ----------------------------
// Parse login history safely
// ----------------------------
let history = [];

const historyField = f["Login History"];
console.log("📚 Raw login history:", historyField);

// Format A — Airtable already parsed into an array of objects or strings
if (Array.isArray(historyField)) {
  history = historyField
    .map(h => h.timestamp || h) // if object → h.timestamp, if string → h
    .filter(Boolean);

  console.log("   ✨ Parsed array history:", history);
}

// Format B — stored as JSON string
else if (typeof historyField === "string" && historyField.trim()) {
  try {
    const parsed = JSON.parse(historyField);
   history = parsed.map(h => ({
  timestamp: h.timestamp || h,
  type: h.type || "Activity",
  details: h.details || null
}));


    console.log("   ✨ Parsed string history:", history);
  } catch (e) {
    console.error("   ❌ Failed to parse history:", e);
    history = [];
  }
} else {
  console.log("   ⚠️ Login History is empty or invalid");
}

// skip user if nothing valid
if (!history || history.length === 0) {
  console.warn("   ⚠️ Skipping user — no usable timestamps:", name);
  continue;
}

// add to user list
users.push({ name, email, type, history, details: f["Details"] || null });

    }


    if (users.length === 0) {
      container.innerHTML = `<p class="text-red-500 text-sm">⚠️ No login activity found.</p>`;
      return;
    }

    const dayGroups = {};

    for (const u of users) {
      for (const entry of u.history) {
  const d = new Date(entry.timestamp);


        if (isNaN(d)) {
          console.warn("⚠️ Invalid date in history:", iso);
          continue;
        }

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
  type: entry.type,
  details: entry.details || null,
  ts: d.getTime(),
  timeStr: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
});

      }
    }

    console.log("📅 Grouped Day Map:", dayGroups);

    const sortedDays = Object.keys(dayGroups).sort((a, b) => {
      const aTs = Math.max(...dayGroups[a].map(ev => ev.ts));
      const bTs = Math.max(...dayGroups[b].map(ev => ev.ts));
      return bTs - aTs;
    });

    console.log("📅 Sorted Days:", sortedDays);

    // -----------------------------
    // Build HTML Output
    // -----------------------------
    let html = `
      <h3 class="text-sm font-semibold text-blue-600 mb-3">Recent Activity</h3>
      <div class="max-h-96 overflow-y-auto pr-2">
    `;

    for (const day of sortedDays) {
      html += `
        <div class="mb-4">
          <h4 class="font-semibold text-gray-700 text-sm mb-2">${day}</h4>
      `;

      const events = dayGroups[day].sort((a, b) => b.ts - a.ts);

      let prevUser = null;

      for (const ev of events) {
        if (ev.user !== prevUser) {
          if (prevUser !== null) html += `</ul>`;
          html += `<div><strong>${ev.user}</strong><ul class="list-disc ml-4">`;
        }

        html += `
          <li class="text-xs text-gray-600">
            ${ev.timeStr} —
<span class="text-blue-600 font-medium">${ev.type}</span>
${ev.details?.takeoffName ? ` — <span class="text-gray-600">${ev.details.takeoffName}</span>` : ""}
${ev.details?.plan ? ` — <span class="text-gray-500">Plan: ${ev.details.plan}</span>` : ""}
${ev.details?.elevation ? ` — <span class="text-gray-500">Elevation: ${ev.details.elevation}</span>` : ""}
${ev.details?.revision ? ` — <span class="text-gray-500">Rev: ${ev.details.revision}</span>` : ""}
${ev.details?.builder ? ` — <span class="text-gray-500">Builder: ${ev.details.builder}</span>` : ""}
          </li>
        `;

        prevUser = ev.user;
      }

      html += `</ul></div></div>`;
    }

    html += `</div>`;

    container.innerHTML = html;

  } catch (err) {
    console.error("🔥 ERROR loading recent activity:", err);
    container.innerHTML = `<p class="text-red-500 text-sm">❌ Failed to load activity timeline.</p>`;
  }
});
