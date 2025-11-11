// takeoff-builder.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🏗️ takeoff-builder.js initialized...");

  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appX1Saz7wMYh4hhm";
  const TABLE_ID = "tblo2Z23S7fYrHhlk";
  const VIEW_ID = "viwov2znF05JU5xFm";

  const builderSelect = document.querySelector("select#builder-select");

  if (!builderSelect) {
    console.error("❌ Builder dropdown not found in DOM!");
    return;
  }

  let allBuilders = [];

  async function fetchBuilders(offset = "") {
    try {
      console.log(`📡 Fetching builders... (offset: ${offset || "none"})`);
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
      url.searchParams.append("view", VIEW_ID);
      url.searchParams.append("pageSize", "100");
      if (offset) url.searchParams.append("offset", offset);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const fetched = data.records
        .map(r => r.fields["Client Name"])
        .filter(Boolean);

      allBuilders.push(...fetched);

      if (data.offset) {
        console.log("➡️ More records found, fetching next page...");
        await fetchBuilders(data.offset);
      } else {
        console.log(`✅ Fetched ${allBuilders.length} total builders.`);
        populateDropdown(allBuilders);
      }
    } catch (err) {
      console.error("❌ Error fetching builders:", err);
    }
  }

  function populateDropdown(builders) {
    // Remove duplicates and sort alphabetically
    const uniqueBuilders = [...new Set(builders)].sort((a, b) =>
      a.localeCompare(b)
    );

    builderSelect.innerHTML = `<option value="">Select Builder</option>`;
    uniqueBuilders.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      builderSelect.appendChild(option);
    });

    console.log("🏁 Builder dropdown populated:", uniqueBuilders.length);
  }

  await fetchBuilders();
});
