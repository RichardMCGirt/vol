// vendor.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🏗️ Vendor Management Script Loaded");

  // ⚙️ Airtable config — replace with your actual credentials
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appK9gZS77OmsIK50";
  const TABLE_ID = "tblYl6d17rYWBJqlV";

  // 🎯 DOM references
  const tableBody = document.getElementById("vendor-table");
  const searchInput = document.getElementById("vendor-search");

  let vendors = [];

  // 📡 Fetch all vendors from Airtable with pagination
  async function fetchAllVendors() {
    console.group("📦 Fetching Vendors from Airtable");
    console.time("Total Fetch Time");

    let allRecords = [];
    let offset = "";

    try {
      do {
        const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
        url.searchParams.append("pageSize", "100");
        if (offset) url.searchParams.append("offset", offset);

        console.log(`📡 Fetching batch (offset: ${offset || "none"})...`);
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        allRecords = [...allRecords, ...data.records];
        offset = data.offset || null;
        console.log(`✅ Fetched ${data.records.length} records this batch`);
      } while (offset);

      console.timeEnd("Total Fetch Time");
      console.log(`📊 Total vendors fetched: ${allRecords.length}`);
      console.groupEnd();

      // Map and clean up vendor list
      vendors = allRecords
        .map((r) => r.fields["Name"])
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      renderVendors(vendors);
    } catch (err) {
      console.error("❌ Error fetching vendors:", err);
      tableBody.innerHTML = `
        <tr><td colspan="2" class="text-center py-4 text-red-600">Error loading vendors.</td></tr>
      `;
      console.groupEnd();
    }
  }

  // 🧱 Render vendor rows
  function renderVendors(list) {
    console.time("Render Vendors");
    tableBody.innerHTML = "";

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="2" class="text-center py-4 text-gray-500">No vendors found.</td></tr>
      `;
      console.timeEnd("Render Vendors");
      return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((name) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-3 px-3 font-medium text-gray-800">${name}</td>
        <td class="py-3 px-3 text-right text-gray-500">⋮</td>
      `;
      fragment.appendChild(tr);
    });

    tableBody.appendChild(fragment);
    console.log(`🔎 Rendered ${list.length} vendors`);
    console.timeEnd("Render Vendors");
  }

  // 🔍 Search filter
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = vendors.filter((v) => v.toLowerCase().includes(term));
    renderVendors(filtered);
  });

  // 🚀 Initialize
  await fetchAllVendors();
});
