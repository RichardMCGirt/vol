// builder.js
document.addEventListener("DOMContentLoaded", async () => {
  console.group("👷 Builder Management Init");

  // ✅ Airtable Configuration
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appX1Saz7wMYh4hhm";
  const TABLE_ID = "tblo2Z23S7fYrHhlk";
  const VIEW_ID = "viwov2znF05JU5xFm"; // 👈 using your specific view

    // 🎯 DOM References
  const builderList = document.getElementById("builder-list");
  const searchInput = document.getElementById("builder-search");
  const divisionFilter = document.getElementById("division-filter");

  builderList.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">⏳ Loading builders...</p>`;

  try {
    // 📦 Fetch All Records from Airtable (with pagination)
    console.time("Fetch Airtable Records (All Pages)");
    let allRecords = [];
    let offset = "";

    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
      url.searchParams.append("pageSize", "100");
      url.searchParams.append("view", VIEW_ID);
      if (offset) url.searchParams.append("offset", offset);

      console.log(`📡 Fetching batch (offset: ${offset || "none"})...`);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      allRecords = [...allRecords, ...data.records];
      offset = data.offset || null;

      console.log(`✅ Batch fetched: ${data.records.length} records`);
    } while (offset);

    console.timeEnd("Fetch Airtable Records (All Pages)");
    console.log(`📊 Total records fetched: ${allRecords.length}`);

    // 🧱 Transform Records
    const records = allRecords.map((rec) => ({
      id: rec.id,
      name: rec.fields["Client Name"] || "Unnamed Builder",
      division: rec.fields["Division"] || "Unknown",
    }));

    // 🧩 Extract unique branches (split by comma)
    const branchSet = new Set();
    records.forEach((r) => {
      const branches = String(r.division)
        .split(",")
        .map((b) => b.trim())
        .filter((b) => b);
      branches.forEach((b) => branchSet.add(b));
    });

    const branches = Array.from(branchSet).sort();
    console.log("🏢 Unique branches:", branches);

    // 🧭 Populate Division Dropdown
    divisionFilter.innerHTML = `<option value="">All Divisions</option>`;
    branches.forEach((branch) => {
      const opt = document.createElement("option");
      opt.value = branch;
      opt.textContent = branch;
      divisionFilter.appendChild(opt);
    });

    // 🎨 Render Function
    function renderBuilders(filterName = "", selectedBranch = "") {
      console.time("Render Builders");

      const filtered = records.filter((r) => {
        const nameMatch = r.name.toLowerCase().includes(filterName.toLowerCase());
        const branchMatch =
          !selectedBranch ||
          r.division
            .split(",")
            .map((b) => b.trim().toLowerCase())
            .includes(selectedBranch.toLowerCase());
        return nameMatch && branchMatch;
      });

      builderList.innerHTML = "";
      const fragment = document.createDocumentFragment();

      if (filtered.length === 0) {
        builderList.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">No builders found.</p>`;
        console.timeEnd("Render Builders");
        return;
      }

      filtered.forEach((r) => {
        const div = document.createElement("div");
        div.className =
          "border border-border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition";

        div.innerHTML = `
          <div>
            <div class="font-semibold text-lg">${r.name}</div>
            <p class="text-xs text-muted-foreground">${r.division}</p>
          </div>
          <button class="border border-gray-300 rounded-md px-3 py-1 text-xs hover:bg-gray-100 transition">
            + Add Plan
          </button>
        `;

        fragment.appendChild(div);
      });

      builderList.appendChild(fragment);
      console.log(`🔎 Rendered ${filtered.length}/${records.length} builders`);
      console.timeEnd("Render Builders");
    }

    // 🖥️ Initial Render
    renderBuilders();

    // 🔍 Debounced Search Input
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderBuilders(e.target.value, divisionFilter.value);
      }, 200);
    });

    // 🧭 Division Filter
    divisionFilter.addEventListener("change", () => {
      renderBuilders(searchInput.value, divisionFilter.value);
    });
  } catch (err) {
    console.error("❌ Error loading builders:", err);
    builderList.innerHTML = `<p class="text-red-600 text-sm text-center py-4">Error loading builders.</p>`;
  }

  console.groupEnd();
});