// ------------------------- CONFIG -------------------------
const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID = "appnZNCcUAJCjGp7L";
const BUILDERS_TABLE_ID = "tblDkASnuImCKBQyO"; // your synced table

const builderSelect   = document.getElementById("builder-select");
const planSelect      = document.getElementById("plan-select");
const elevationSelect = document.getElementById("elevation-select");
const saveBtn         = document.getElementById("savePlanElevation");

// Simple guard if elements are missing
if (!builderSelect || !planSelect || !elevationSelect || !saveBtn) {
  console.error("❌ Required elements not found in DOM. Check your IDs in takeoff-creation.html");
}

// ------------------------- HELPERS -------------------------
async function fetchAirtableRecords() {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}?pageSize=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} fetching builders. Body: ${text}`);
  }

  const data = await res.json();
  console.log("📦 Fetched Builders:", data.records?.length ?? 0);
  return data.records || [];
}

function findBuilderRecord(records, builderSelectEl) {
  const dropdownValue = (builderSelectEl.value || "").trim();
  const dropdownText =
    builderSelectEl.options[builderSelectEl.selectedIndex]?.textContent?.trim().toLowerCase();

  const builder =
    records.find(r => (r.fields["Client Name"] || "").toLowerCase() === dropdownText) ||
    records.find(r => (r.fields["Client Name"] || "").toLowerCase() === dropdownValue.toLowerCase());

  if (!builder) {
    alert("Builder not found in Airtable (check console)");
    console.table(records.map(r => ({ ID: r.id, Name: r.fields["Client Name"] })));
    return null;
  }

  console.log("✅ Matched builder:", builder.id, builder.fields["Client Name"]);
  return builder;
}

// ------------------------- POPULATE: BUILDERS -------------------------
let buildersLoaded = false;

async function populateBuilderDropdown() {
  if (!builderSelect) return;
  if (buildersLoaded && builderSelect.options.length > 1) {
    // already populated
    return;
  }

  builderSelect.innerHTML = `<option value="">Select Builder</option>`;

  let records = [];
  try {
    records = await fetchAirtableRecords();
  } catch (err) {
    console.error("❌ Failed to fetch builders:", err);
    builderSelect.innerHTML = `<option value="">Failed to load builders</option>`;
    return;
  }

  // Sort by name for nicer UX
  const rows = records
    .map(r => ({ id: r.id, name: (r.fields["Client Name"] || "").trim() }))
    .filter(r => r.name);

  rows.sort((a, b) => a.name.localeCompare(b.name));

  for (const row of rows) {
    const opt = document.createElement("option");
    opt.value = row.name;          // keep value as name for your existing matcher
    opt.textContent = row.name;    // display name
    builderSelect.appendChild(opt);
  }

  buildersLoaded = true;
  console.log(`✅ Populated ${rows.length} builders into dropdown`);
}

// ------------------------- POPULATE: COMMUNITIES -------------------------
const COMMUNITY_TABLE_ID = "tblYIxFxH2swiBZiI";
const communitySelect = document.getElementById("community-select");

async function fetchCommunities() {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${COMMUNITY_TABLE_ID}?pageSize=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} fetching communities. Body: ${text}`);
  }

  const data = await res.json();
  console.log("🏘️ Fetched Communities:", data.records?.length ?? 0);
  return data.records || [];
}

async function populateCommunityDropdown() {
  if (!communitySelect) return;

  communitySelect.innerHTML = `<option value="">Loading Communities...</option>`;

  let records = [];
  try {
    records = await fetchCommunities();
  } catch (err) {
    console.error("❌ Failed to fetch communities:", err);
    communitySelect.innerHTML = `<option value="">Failed to load communities</option>`;
    return;
  }

  const rows = records
    .map(r => ({ id: r.id, name: (r.fields["Community Name"] || "").trim() }))
    .filter(r => r.name);

  rows.sort((a, b) => a.name.localeCompare(b.name));

  communitySelect.innerHTML = `<option value="">Select Community</option>`;
  for (const row of rows) {
    const opt = document.createElement("option");
    opt.value = row.name;
    opt.textContent = row.name;
    communitySelect.appendChild(opt);
  }

  console.log(`✅ Populated ${rows.length} communities`);
}

// ------------------------- INIT COMMUNITIES -------------------------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await populateCommunityDropdown();
  } catch (err) {
    console.error("❌ Error initializing communities:", err);
  }
});


// ------------------------- POPULATE: PLAN/ELEVATION -------------------------
async function populatePlanElevation(builderSelectEl) {
  let records = [];
  try {
    records = await fetchAirtableRecords();
  } catch (err) {
    console.error("❌ Failed to fetch builders when populating plan/elevation:", err);
    return;
  }

  const builder = findBuilderRecord(records, builderSelectEl);
  if (!builder) return;

  // Read synced + stored data
  const planValue       = builder.fields["Plan"];
  const elevationValue  = builder.fields["Elevation"];
  const jsonRaw         = builder.fields["PlanElevationJSON"];

  let existingJSON = { plans: [], elevations: [] };
  try {
    if (jsonRaw) existingJSON = JSON.parse(jsonRaw);
  } catch (err) {
    console.warn("⚠️ Invalid PlanElevationJSON format:", err);
  }

  console.log("📊 Existing JSON (for builder):", builder.fields["Client Name"], existingJSON);

  const plans = Array.from(
    new Set([
      ...(Array.isArray(existingJSON.plans) ? existingJSON.plans : []),
      ...(planValue ? [planValue] : []),
    ])
  );

  const elevations = Array.from(
    new Set([
      ...(Array.isArray(existingJSON.elevations) ? existingJSON.elevations : []),
      ...(elevationValue ? [elevationValue] : []),
    ])
  );

  planSelect.innerHTML = "";
  elevationSelect.innerHTML = "";

  // If there are no saved plans/elevations yet, still show a placeholder
  if (plans.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No plans yet";
    planSelect.appendChild(opt);
  } else {
    plans.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      planSelect.appendChild(opt);
    });
  }

  if (elevations.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No elevations yet";
    elevationSelect.appendChild(opt);
  } else {
    elevations.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e;
      opt.textContent = e;
      elevationSelect.appendChild(opt);
    });
  }

  // Add creation options
  const newPlan = document.createElement("option");
  newPlan.value = "__new__";
  newPlan.textContent = "+ Create New Plan";
  planSelect.appendChild(newPlan);

  const newElevation = document.createElement("option");
  newElevation.value = "__new__";
  newElevation.textContent = "+ Create New Elevation";
  elevationSelect.appendChild(newElevation);
}

planSelect.addEventListener("change", () => {
  if (planSelect.value === "__new__") {
    const newPlan = prompt("Enter new Plan name:");
    if (newPlan && newPlan.trim()) {
      const opt = document.createElement("option");
      opt.value = newPlan.trim();
      opt.textContent = newPlan.trim();
      planSelect.insertBefore(opt, planSelect.lastElementChild); // place before +Create option
      planSelect.value = newPlan.trim();
    } else {
      planSelect.value = "";
    }
  }
});

elevationSelect.addEventListener("change", () => {
  if (elevationSelect.value === "__new__") {
    const newElevation = prompt("Enter new Elevation name:");
    if (newElevation && newElevation.trim()) {
      const opt = document.createElement("option");
      opt.value = newElevation.trim();
      opt.textContent = newElevation.trim();
      elevationSelect.insertBefore(opt, elevationSelect.lastElementChild);
      elevationSelect.value = newElevation.trim();
    } else {
      elevationSelect.value = "";
    }
  }
});


// ------------------------- PATCH BACK -------------------------
async function updateBuilderFields(builderId, planText, elevationText) {
  // 1️⃣ Fetch the latest record
  const resFetch = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}/${builderId}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } }
  );
  if (!resFetch.ok) {
    console.error("❌ Fetch failed", await resFetch.text());
    alert("Failed to fetch builder record. See console.");
    return;
  }
  const data = await resFetch.json();

  // 2️⃣ Safely parse existing JSON
  let currentJSON = { plans: [], elevations: [] };
  try {
    if (data.fields["PlanElevationJSON"]) {
      currentJSON = JSON.parse(data.fields["PlanElevationJSON"]);
    }
  } catch {
    console.warn("⚠️ Bad JSON, starting fresh");
  }

  // 3️⃣ Merge new values
  const updatedPlans = Array.from(
    new Set([...(currentJSON.plans || []), planText])
  );
  const updatedElevations = Array.from(
    new Set([...(currentJSON.elevations || []), elevationText])
  );

  // 4️⃣ Patch back to Airtable
  const payload = {
    fields: {
      "Plan (Editable)": planText,
      "Elevation (Editable)": elevationText,
      "PlanElevationJSON": JSON.stringify({
        plans: updatedPlans,
        elevations: updatedElevations,
      }),
    },
  };

  console.log("📤 Updating Builder:", builderId, payload);

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}/${builderId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const updated = await res.json();
  if (!res.ok) {
    console.error("❌ Airtable error:", updated);
    alert("Patch failed. See console.");
    return;
  }

  console.log("✅ Builder updated:", updated);
  alert("✅ Builder plan/elevation added!");

  // 5️⃣ Immediately refresh the dropdowns so user sees new values
  await populatePlanElevation(builderSelect);
}

// ------------------------- EVENTS & INIT -------------------------
function wireEventsOnce() {
  const saveBtn = document.getElementById("savePlanElevation"); // force recheck in case it loaded late

  if (!builderSelect || !saveBtn) {
    console.error("❌ Missing required elements:", {
      builderSelect: !!builderSelect,
      saveBtn: !!saveBtn,
    });
    return;
  }
  // Avoid duplicate listeners
  builderSelect.onchange = async () => {
    console.log("📤 Builder changed → repopulating plans/elevations");
    await populatePlanElevation(builderSelect);
  };

  saveBtn.onclick = async () => {
    console.log("💾 Save button clicked");
    let records = [];
    try {
      records = await fetchAirtableRecords();
    } catch (err) {
      console.error("❌ Failed to fetch builders (save click):", err);
      alert("Could not load builders from Airtable. Check console for details.");
      return;
    }

    const builder = findBuilderRecord(records, builderSelect);
    if (!builder) {
      alert(
        "⚠️ No matching builder found.\n\nMake sure the 'Client Name' in Airtable exactly matches the selected builder name."
      );
      return;
    }

    let planText = planSelect.value;
    let elevationText = elevationSelect.value;

    // Allow new entry
    if (planText === "__new__") {
      planText = prompt("Enter new Plan name:") || "";
    }
    if (elevationText === "__new__") {
      elevationText = prompt("Enter new Elevation name:") || "";
    }

    if (!planText.trim() || !elevationText.trim()) {
      alert("Please enter both a Plan and Elevation name.");
      return;
    }

    try {
      console.log("📡 Patching to Airtable with:", planText, elevationText);
      await updateBuilderFields(builder.id, planText.trim(), elevationText.trim());

      // Immediately refresh dropdowns to reflect new entries
      await populatePlanElevation(builderSelect);
      console.log("✅ Refresh complete after update");
    } catch (err) {
      console.error("❌ Failed to update builder:", err);
      alert("Update failed — see console for details.");
    }
  };
}


// Initialize on DOM ready (script is at end of body, but be safe)
document.addEventListener("DOMContentLoaded", async () => {
  try {
    wireEventsOnce();
    await populateBuilderDropdown();     // <<< THIS WAS MISSING
    // If user had one selected (e.g., back nav), load their plans/elevations
    if (builderSelect && builderSelect.value) {
      await populatePlanElevation(builderSelect);
    }
  } catch (err) {
    console.error("❌ Initialization error:", err);
  }
});
