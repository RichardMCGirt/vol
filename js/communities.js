// communities.js (merged version)
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🏘️ Merged Communities Script Loaded");

  // ---------------- CONFIG ----------------
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const COMMUNITIES_TABLE_ID = "tblYIxFxH2swiBZiI";
  const BUILDERS_TABLE_ID = "tblDkASnuImCKBQyO";

  // ---------------- ELEMENTS ----------------
  const tableBody = document.querySelector("#communities-table-body");
  const modal = document.getElementById("community-modal");
  const form = document.getElementById("community-form");
  const builderSelect = document.getElementById("community-builder");
  const createBtn = document.getElementById("create-community");
  const closeBtn = document.getElementById("close-modal");
  const cancelBtn = document.getElementById("cancel-community");
  const refreshBtn = document.getElementById("refresh-communities");

  let currentRecordId = null; // Track edit vs create

  // ---------------- FETCH HELPERS ----------------
  async function fetchCommunities(offset = null, all = []) {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${COMMUNITIES_TABLE_ID}?pageSize=100&expand[]=Builder`;
    if (offset) url += `&offset=${offset}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    all.push(...data.records);
    if (data.offset) return fetchCommunities(data.offset, all);
    return all;
  }

  async function fetchBuilders(offset = null, builders = []) {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}?pageSize=100`;
    if (offset) url += `&offset=${offset}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const newBuilders = data.records
      .map(r => ({
        id: r.id,
        name: r.fields["Client Name"],
      }))
      .filter(b => b.name);

    builders.push(...newBuilders);
    if (data.offset) return fetchBuilders(data.offset, builders);
    return builders;
  }

  async function getBuilderRecordId(name) {
    const formula = `LOWER(TRIM({Client Name})) = LOWER(TRIM("${name.trim()}"))`;
    const url = `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const data = await res.json();
    return data.records?.[0]?.id || null;
  }

  // ---------------- UI LOADERS ----------------
  async function populateBuilderDropdown() {
    try {
      // ✅ Prevent duplicate repopulation
      if (builderSelect.options.length > 1) return;

      const builders = await fetchBuilders();
      builderSelect.innerHTML = '<option value="">Select Builder</option>';
      builders.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.name;
        opt.textContent = b.name;
        builderSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("❌ Error loading builders:", err);
      builderSelect.innerHTML = '<option>Error loading builders</option>';
    }
  }

  async function fetchBuilderNames(ids) {
    if (!ids.length) return {};
    const url = `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}?filterByFormula=OR(${ids
      .map(id => `RECORD_ID()="${id}"`)
      .join(",")})`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const data = await res.json();

    const map = {};
    data.records.forEach(r => {
      map[r.id] = r.fields["Client Name"];
    });
    return map;
  }

async function loadCommunities() {
  try {
    tableBody.innerHTML = `<tr><td colspan="5" class="py-3 text-center text-gray-500">Loading...</td></tr>`;
    const communities = await fetchCommunities();
    console.log(`✅ Loaded ${communities.length} communities`);

    // ------------------------------------------
    // 1. Build map of Builder IDs → Builder Names
    // ------------------------------------------
    const builderIds = new Set();
    communities.forEach(rec => {
      const ids = rec.fields["Builder"] || [];
      ids.forEach(id => builderIds.add(id));
    });

    const builderMap = await fetchBuilderNames([...builderIds]);

    // ------------------------------------------
    // 2. GROUP COMMUNITIES BY BRANCH
    // ------------------------------------------
    const groups = {};
    communities.forEach(rec => {
      const f = rec.fields;

      const branch = (f["Branch"] || "—").trim();
      if (!groups[branch]) groups[branch] = [];
      groups[branch].push(rec);
    });

    // Sort branches alphabetically
    const sortedBranches = Object.keys(groups).sort();

    // ------------------------------------------
    // 3. RENDER BY BRANCH
    // ------------------------------------------
    tableBody.innerHTML = "";

    sortedBranches.forEach(branch => {
      // Branch header row
      const headerRow = document.createElement("tr");
      headerRow.innerHTML = `
        <td colspan="5" class="bg-gray-200 font-semibold py-2 px-3 text-gray-700">
          ${branch}
        </td>
      `;
      tableBody.appendChild(headerRow);

      // Rows under this branch
      groups[branch].forEach(rec => {
        const f = rec.fields;

        const builderId = f["Builder"]?.[0];
        const builderName = builderMap[builderId] || "—";

        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="py-3 px-3 font-medium text-gray-800">${f["Community Name"] || "—"}</td>
          <td class="py-3 px-3">${builderName}</td>
          <td class="py-3 px-3">${branch}</td>
          <td class="py-3 px-3 text-right">
            <button data-id="${rec.id}" class="edit-btn text-blue-600 hover:underline text-sm">Edit</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    });

    // Rebind edit buttons
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const recordId = e.target.dataset.id;
        openEditModal(recordId);
      });
    });

  } catch (err) {
    console.error("❌ Error loading communities:", err);
    tableBody.innerHTML = `<tr><td colspan="5" class="py-3 text-center text-red-500">Failed to load data</td></tr>`;
  }
}


  // ---------------- CREATE / EDIT ----------------
  async function openEditModal(recordId) {
    currentRecordId = recordId;
    modal.classList.remove("hidden");
    document.getElementById("modal-title").textContent = "Edit Community";

    try {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${COMMUNITIES_TABLE_ID}/${recordId}?expand[]=Builder`, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      const data = await res.json();
      const f = data.fields;

      await populateBuilderDropdown();

      document.getElementById("communityName").value = f["Community Name"] || "";
      document.getElementById("startDate").value = f["Start Date"] || "";
      document.getElementById("estimatedCompletion").value = f["Estimated Completion"] || "";

      if (Array.isArray(f["Builder (from Builder)"]) && f["Builder (from Builder)"].length > 0) {
        builderSelect.value = f["Builder (from Builder)"][0];
      } else if (Array.isArray(f["Builder"]) && f["Builder"].length > 0) {
        const builderId = f["Builder"][0];
        const builders = await fetchBuilders();
        const builder = builders.find(b => b.id === builderId);
        if (builder) builderSelect.value = builder.name;
      }
    } catch (err) {
      console.error("❌ Error loading record for edit:", err);
      alert("Failed to load record details.");
    }
  }

  async function createOrUpdateCommunity() {
    const name = document.getElementById("communityName").value.trim();
    const builder = builderSelect.value.trim();
    const startDate = document.getElementById("startDate").value || "";
    const estimatedCompletion = document.getElementById("estimatedCompletion").value || "";

    const builderId = await getBuilderRecordId(builder);
    if (!builderId) {
      alert(`❌ Could not find builder record for "${builder}"`);
      return;
    }

    const payload = {
      fields: {
        "Community Name": name,
        "Builder": [builderId],
        "Start Date": startDate,
        "Estimated Completion": estimatedCompletion,
      },
    };

    try {
      const method = currentRecordId ? "PATCH" : "POST";
      const url = currentRecordId
        ? `https://api.airtable.com/v0/${BASE_ID}/${COMMUNITIES_TABLE_ID}/${currentRecordId}`
        : `https://api.airtable.com/v0/${BASE_ID}/${COMMUNITIES_TABLE_ID}`;

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("✅ Record saved:", data);
      modal.classList.add("hidden");
      currentRecordId = null;
      await loadCommunities();
    } catch (err) {
      console.error("❌ Error saving community:", err);
    }
  }

  // ---------------- EVENT LISTENERS ----------------
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      currentRecordId = null;
      modal.classList.remove("hidden");
      document.getElementById("modal-title").textContent = "Add New Community";
      form.reset();
      populateBuilderDropdown();
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  if (cancelBtn) cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
  if (refreshBtn) refreshBtn.addEventListener("click", loadCommunities);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    await createOrUpdateCommunity();
  });

  // ---------------- INIT ----------------
  await loadCommunities();
  await populateBuilderDropdown();
});
