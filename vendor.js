// vendor.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🏗️ Vendor Management Script Loaded");

  // 🔧 Airtable config — replace these with your own
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appK9gZS77OmsIK50";
  const TABLE_ID = "tblYl6d17rYWBJqlV";

  const tableBody = document.getElementById("vendor-table");
  const searchInput = document.getElementById("vendor-search");

  let vendors = [];

  // Fetch vendor data
  async function fetchVendors() {
    try {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      const data = await response.json();
      vendors = data.records.map(r => r.fields["Name"]).filter(Boolean);
      renderVendors(vendors);
    } catch (err) {
      console.error("❌ Error fetching vendors:", err);
      tableBody.innerHTML = `
        <tr><td colspan="2" class="text-center py-4 text-red-600">Error loading vendors.</td></tr>
      `;
    }
  }

  // Render vendor list
  function renderVendors(list) {
    tableBody.innerHTML = "";
    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="2" class="text-center py-4 text-gray-500">No vendors found.</td></tr>
      `;
      return;
    }

    list.forEach(name => {
      const row = `
        <tr>
          <td class="py-3 px-3 font-medium text-gray-800">${name}</td>
          <td class="py-3 px-3 text-right text-gray-500">⋮</td>
        </tr>`;
      tableBody.insertAdjacentHTML("beforeend", row);
    });
  }

  // Search filtering
  searchInput.addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    const filtered = vendors.filter(v => v.toLowerCase().includes(term));
    renderVendors(filtered);
  });

  // Initial load
  await fetchVendors();
});