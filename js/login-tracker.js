document.addEventListener("DOMContentLoaded", async () => {
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const TABLE_ID = "tbl1ymzV1CYldIGJU";
  const container = document.getElementById("login-history");

  if (!container) {
    console.warn("⚠️ Missing #login-history container.");
    return;
  }

  container.innerHTML = `<p class="text-gray-500 text-sm">Loading all login history...</p>`;

  try {
    // Fetch all user records
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      container.innerHTML = `<p class="text-red-500 text-sm">❌ Failed to load login history (${response.status}).</p>`;
      return;
    }

    const data = await response.json();
    const users = data.records || [];

    if (users.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-sm">No user records found.</p>`;
      return;
    }

    // Sort users by most recent login
    const processed = users.map(record => {
      const fields = record.fields || {};
      let history = [];
      try {
        history = JSON.parse(fields["Login History"] || "[]");
      } catch {
        history = [];
      }
      const lastLogin = history.length ? new Date(history[history.length - 1]) : null;
      return {
        name: fields["Full Name"] || fields["email"] || "Unknown User",
        email: fields["email"] || "—",
        history,
        lastLogin,
      };
    });

    processed.sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));

    // Build HTML
    const html = processed
      .map(user => {
        const recent = user.history
          .slice(-5)
          .reverse()
          .map(ts => {
            const d = new Date(ts);
            return `<li class="text-xs text-gray-500">${d.toLocaleString()}</li>`;
          })
          .join("");

        return `
          <div class="border-b border-gray-200 pb-2 mb-3">
            <h3 class="font-medium text-gray-800 text-sm">${user.name}</h3>
            <p class="text-xs text-gray-600 mb-1">${user.email}</p>
            <ul class="list-disc ml-4">${recent || "<li class='text-xs text-gray-400'>No history</li>"}</ul>
          </div>
        `;
      })
      .join("");

    container.innerHTML = `
      <h3 class="text-sm font-semibold text-blue-600 mb-3">All User Login Activity</h3>
      <div class="max-h-96 overflow-y-auto pr-2">
        ${html}
      </div>
    `;
  } catch (err) {
    console.error("🔥 Error fetching all user login history:", err);
    container.innerHTML = `<p class="text-red-500 text-sm">⚠️ Unable to fetch all login history.</p>`;
  }
});
