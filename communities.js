// communities.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🏘️ Communities Script Loaded");

  // ---------------- CONFIG ----------------
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const COMMUNITIES_TABLE_ID = "tblYIxFxH2swiBZiI";
  const BUILDERS_TABLE_ID = "tblDkASnuImCKBQyO";

  const tableBody = document.querySelector("tbody");
  const modal = document.getElementById("community-modal");
  const form = document.getElementById("community-form");
  const builderSelect = document.getElementById("community-builder");

  let currentRecordId = null; // track which record is being edited

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

    const newBuilders = data.records.map(r => ({
      id: r.id,
      name: r.fields["Client Name"],
    })).filter(b => b.name);

    builders.push(...newBuilders);
    if (data.offset) return fetchBuilders(data.offset, builders);
    return builders;
  }

  // ---------------- DISPLAY ----------------
 async function loadCommunities() {
  try {
    tableBody.innerHTML = `<tr><td colspan="5" class="py-3 text-center text-gray-500">Loading...</td></tr>`;
    const communities = await fetchCommunities();
    console.log(`✅ Loaded ${communities.length} communities`);

    // Collect all builder record IDs
    const builderIds = new Set();
    communities.forEach(rec => {
      const ids = rec.fields["Builder"] || [];
      ids.forEach(id => builderIds.add(id));
    });

    // Fetch builder records once
    const builderMap = await fetchBuilderNames([...builderIds]);

    tableBody.innerHTML = "";
    communities.forEach(rec => {
      const f = rec.fields;
      const builderId = f["Builder"]?.[0];
      const builderName = builderMap[builderId] || "—";
      const branch = Array.isArray(f["Division (from Builder)"]) ? f["Division (from Builder)"][0] : "—";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="py-3 px-3 font-medium text-gray-800">${f["Community Name"] || "—"}</td>
        <td class="py-3 px-3">${branch}</td>
        <td class="py-3 px-3">${builderName}</td>
        <td class="py-3 px-3"><span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-md">${f["Status"] || "Draft"}</span></td>
        <td class="py-3 px-3 text-right">
          <button data-id="${rec.id}" class="edit-btn text-blue-600 hover:underline text-sm">Edit</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    // rebind edit buttons after table is rendered
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

// Helper: fetch all builders by IDs
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

  // ---------------- MODAL & EDIT ----------------
  async function openEditModal(recordId) {
  console.log("✏️ Opening edit modal for record:", recordId);
  currentRecordId = recordId;

  // Show modal
  modal.classList.remove("hidden");
  document.getElementById("modal-title").textContent = "Edit Community";

  try {
    // Fetch community record
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${COMMUNITIES_TABLE_ID}/${recordId}?expand[]=Builder`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const data = await res.json();
    const f = data.fields;
    console.log("📦 Loaded community for edit:", f);

    // Fetch all builders
    const builders = await fetchBuilders();
    const builderDropdown = document.getElementById("community-builder");
    builderDropdown.innerHTML = '<option value="">Select Builder</option>';

    builders.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.name;
      opt.textContent = b.name;
      builderDropdown.appendChild(opt);
    });

    // Populate modal fields
    document.getElementById("communityName").value = f["Community Name"] || "";
    document.getElementById("planName").value = f["Plan name"] || "";
    document.getElementById("startDate").value = f["Start Date"] || "";
    document.getElementById("estimatedCompletion").value = f["Estimated Completion"] || "";

    // Handle builder preselection
    if (Array.isArray(f["Builder (from Builder)"]) && f["Builder (from Builder)"].length > 0) {
      builderDropdown.value = f["Builder (from Builder)"][0];
    } else if (Array.isArray(f["Builder"]) && f["Builder"].length > 0) {
      const builderId = f["Builder"][0];
      const builder = builders.find(b => b.id === builderId);
      if (builder) builderDropdown.value = builder.name;
    }

  } catch (err) {
    console.error("❌ Error loading record for edit:", err);
    alert("Failed to load record details.");
  }
}

async function createCommunity() {
  const name = document.getElementById("communityName").value.trim();
  const plan = document.getElementById("planName").value.trim();
  const builder = document.getElementById("community-builder").value.trim();
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
      "Plan name": plan,
      "Builder": [builderId],
      "Start Date": startDate,
      "Estimated Completion": estimatedCompletion,
    },
  };

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${COMMUNITIES_TABLE_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    console.log("✅ New community created:", data);
    modal.classList.add("hidden");
    await loadCommunities();
  } catch (err) {
    console.error("❌ Error creating community:", err);
  }
}


  async function populateBuilderDropdown() {
    try {
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
    }
  }

  // ---------------- PATCH (Save Edits) ----------------
  async function saveEdits() {
  const name = document.getElementById("communityName").value.trim();
  const plan = document.getElementById("planName").value.trim();
  const builder = document.getElementById("community-builder").value.trim();
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
      "Plan name": plan,
      "Builder": [builderId],
      "Start Date": startDate,
      "Estimated Completion": estimatedCompletion,
    },
  };

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${COMMUNITIES_TABLE_ID}/${currentRecordId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    console.log("✅ Record updated:", data);
    modal.classList.add("hidden");
    currentRecordId = null; // reset edit mode
    await loadCommunities();
  } catch (err) {
    console.error("❌ Error updating record:", err);
  }
}


  // ---------------- HELPER ----------------
  async function getBuilderRecordId(name) {
    const formula = `LOWER(TRIM({Client Name})) = LOWER(TRIM("${name.trim()}"))`;
    const url = `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const data = await res.json();
    return data.records?.[0]?.id || null;
  }

  // ---------------- EVENT LISTENERS ----------------
  document.getElementById("cancel-community").addEventListener("click", () => {
    modal.classList.add("hidden");
    currentRecordId = null;
  });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("🧩 Submit clicked | currentRecordId =", currentRecordId);

  if (currentRecordId) {
    console.log("🛠️ Running saveEdits() for record:", currentRecordId);
    await saveEdits();
  } else {
    console.log("🆕 Running createCommunity()");
    await createCommunity();
  }
});

// ✅ Load initial data immediately on page load
await loadCommunities();
await populateBuilderDropdown();

}); // <-- this closes the DOMContentLoaded event

document.getElementById("create-community").addEventListener("click", async () => {
  currentRecordId = null;
  await createCommunity();
});
