document.addEventListener("DOMContentLoaded", async () => {

const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID = "appnZNCcUAJCjGp7L";
const TABLE_ID = "tbl1ymzV1CYldIGJU";


  const email = localStorage.getItem("loggedInUser");
  const recordId = localStorage.getItem("userRecordId");
  const container = document.getElementById("login-history");

  if (!email || !recordId || !container) return;

  // Fetch user
  const response = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`,
    {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    }
  );
  const data = await response.json();
  const fields = data.fields;

  let history = [];
  try {
    history = JSON.parse(fields["Login History"] || "[]");
  } catch (e) {
    console.error("❌ Could not parse login history JSON", e);
  }

  // Format history for display
  const htmlList = history
    .slice(-10) // last 10 logins
    .reverse()
    .map(ts => {
      const d = new Date(ts);
      return `<li>${d.toLocaleString()}</li>`;
    }).join("");

  container.innerHTML = `
    <h3 class="text-sm font-semibold text-blue-600 mb-2">Recent Logins</h3>
    <ul class="text-xs text-gray-600 space-y-1">
      ${htmlList}
    </ul>
  `;
});
