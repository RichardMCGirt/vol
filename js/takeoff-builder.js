// ------------------------- CONFIG -------------------------
const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID = "appnZNCcUAJCjGp7L";

// Source tables
const BUILDERS_TABLE_ID = "tblDkASnuImCKBQyO";   // Builders (has "Client Name")
const TAKEOFFS_TABLE_ID = "tblYIxFxH2swiBZiI";   // Takeoffs (linked {Builder}, has "Community Name" or "Community (from Name)")

// DOM elements (must exist in takeoff-creation.html)
const builderSelect   = document.getElementById("builder-select");
const planSelect      = document.getElementById("plan-select");
const elevationSelect = document.getElementById("elevation-select");
const saveBtn         = document.getElementById("savePlanElevation");
const communitySelect = document.getElementById("community-select");

// Guards
if (!builderSelect || !planSelect || !elevationSelect || !saveBtn || !communitySelect) {
  console.error("❌ Required elements not found in DOM. Check your IDs in takeoff-creation.html");
}

// ------------------------- HELPERS (BUILDERS TABLE) -------------------------
async function fetchBuilderRecords() {
 let allRecords = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} fetching builders`);
    const data = await res.json();

    allRecords = allRecords.concat(data.records || []);
    offset = data.offset; // Airtable sends this if more pages remain
  } while (offset);

  console.log(`📦 Total builders fetched: ${allRecords.length}`);
  return allRecords;
}

function findBuilderRecord(records, builderSelectEl) {
  const dropdownValue = (builderSelectEl.value || "").trim().toLowerCase();
  const dropdownText =
    builderSelectEl.options[builderSelectEl.selectedIndex]?.textContent?.trim().toLowerCase();

  console.group("🔍 findBuilderRecord()");
  console.log("🎯 Dropdown value:", dropdownValue);
  console.log("🎯 Dropdown text:", dropdownText);

  // Try exact match by name
  const builder = records.find(r => {
    const clientName = (r.fields["Client Name"] || "").trim().toLowerCase();
    return clientName === dropdownText || clientName === dropdownValue;
  });

  if (!builder) {
    console.warn("⚠️ No builder match found. Showing possible close matches:");
    const sample = records
      .map(r => r.fields["Client Name"])
      .filter(Boolean)
      .filter(name => name.toLowerCase().includes(dropdownValue.slice(0, 4)))
      .slice(0, 10);
    console.table(sample.map(name => ({ "Client Name": name })));

    console.groupEnd();
    return null;
  }

  console.log("✅ Matched builder:", builder.id, builder.fields["Client Name"]);
  console.groupEnd();
  return builder;
}


// ------------------------- POPULATE: BUILDERS -------------------------
let buildersLoaded = false;

async function populateBuilderDropdown() {
  if (!builderSelect) return;
  if (buildersLoaded && builderSelect.options.length > 1) return;

  builderSelect.innerHTML = `<option value="">Select Builder</option>`;

  let records = [];
  try {
    records = await fetchBuilderRecords();
  } catch (err) {
    console.error("❌ Failed to fetch builders:", err);
    builderSelect.innerHTML = `<option value="">Failed to load builders</option>`;
    return;
  }

  // Extract record IDs + Client Names
  const rows = records
    .map(r => ({ id: r.id, name: (r.fields["Client Name"] || "").trim() }))
    .filter(r => r.name);

  rows.sort((a, b) => a.name.localeCompare(b.name));

  for (const row of rows) {
    const opt = document.createElement("option");
    opt.value = row.id;         // ⭐ USE RECORD ID
    opt.textContent = row.name; // Display builder name
    builderSelect.appendChild(opt);
  }

  buildersLoaded = true;
  console.log(`✅ Populated ${rows.length} builders into dropdown`);
}


// ------------------------- POPULATE: PLAN/ELEVATION (from Builder record) -------------------------
async function populatePlanElevation(builderSelectEl) {
  console.group("🏗️ populatePlanElevation()");
  let records = [];

  try {
    console.log("📡 Fetching builder records...");
    records = await fetchBuilderRecords();
    console.log(`✅ Retrieved ${records.length} builder records`);
  } catch (err) {
    console.error("❌ Failed to fetch builders when populating plan/elevation:", err);
    console.groupEnd();
    return;
  }

  console.log("🔍 Attempting to find builder matching dropdown...");
  const builder = findBuilderRecord(records, builderSelectEl);
  if (!builder) {
    console.warn("⚠️ No matching builder found for selection:", builderSelectEl.value);
    console.groupEnd();
    return;
  }

  console.log("✅ Found builder:", builder.id, builder.fields["Client Name"]);

  const planValue      = builder.fields["Plan"];
  const elevationValue = builder.fields["Elevation"];
  const jsonRaw        = builder.fields["PlanElevationJSON"];

  console.table([
    { Field: "Plan", Value: planValue },
    { Field: "Elevation", Value: elevationValue },
    { Field: "PlanElevationJSON (raw)", Value: jsonRaw },
  ]);

  let existingJSON = { plans: [], elevations: [] };
  try {
    if (jsonRaw) {
      existingJSON = JSON.parse(jsonRaw);
      console.log("🧩 Parsed JSON successfully:", existingJSON);
    } else {
      console.warn("⚠️ No JSON stored for this builder");
    }
  } catch (err) {
    console.warn("⚠️ Invalid PlanElevationJSON format:", err, "Raw JSON:", jsonRaw);
  }

  // Combine and dedupe
  const plans = Array.from(new Set([
    ...(Array.isArray(existingJSON.plans) ? existingJSON.plans : []),
    ...(planValue ? [planValue] : []),
  ]));

  const elevations = Array.from(new Set([
    ...(Array.isArray(existingJSON.elevations) ? existingJSON.elevations : []),
    ...(elevationValue ? [elevationValue] : []),
  ]));

  console.table([
    { Step: "Merged Plans", Plans: JSON.stringify(plans) },
    { Step: "Merged Elevations", Elevations: JSON.stringify(elevations) },
  ]);

  // Clear dropdowns
  planSelect.innerHTML = "";
  elevationSelect.innerHTML = "";

  // Populate Plans
  if (plans.length === 0) {
    console.warn("⚠️ No plans found to populate");
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
      console.log(`📄 Added plan option: "${p}"`);
    });
  }

  // Populate Elevations
  if (elevations.length === 0) {
    console.warn("⚠️ No elevations found to populate");
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
      console.log(`📄 Added elevation option: "${e}"`);
    });
  }

  console.log("✅ Dropdowns updated. Total options → Plans:", planSelect.options.length, "Elevations:", elevationSelect.options.length);
  console.groupEnd();
}

// ------------------------- ADD PLAN / ELEVATION BUTTONS -------------------------
document.getElementById("add-plan-btn")?.addEventListener("click", () => {
  const newPlan = prompt("Enter new Plan name:");
  if (newPlan && newPlan.trim()) {
    const opt = document.createElement("option");
    opt.value = newPlan.trim();
    opt.textContent = newPlan.trim();
    planSelect.appendChild(opt);
    planSelect.value = newPlan.trim();
    console.log("🆕 Added new plan:", newPlan.trim());
  }
});

document.getElementById("add-elevation-btn")?.addEventListener("click", () => {
  const newElevation = prompt("Enter new Elevation name:");
  if (newElevation && newElevation.trim()) {
    const opt = document.createElement("option");
    opt.value = newElevation.trim();
    opt.textContent = newElevation.trim();
    elevationSelect.appendChild(opt);
    elevationSelect.value = newElevation.trim();
    console.log("🆕 Added new elevation:", newElevation.trim());
  }
});

// Utility: create inline input under a dropdown
function createInlineInput(selectEl, placeholder, onSubmit) {
  // Remove any existing inline input
  const existing = selectEl.parentElement.querySelector(".inline-input");
  if (existing) existing.remove();

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.className =
    "inline-input mt-2 w-full border border-blue-300 rounded-md px-2 py-1 text-sm focus:ring focus:ring-blue-100";
  selectEl.parentElement.appendChild(input);

  input.focus();

  // Handle submission via Enter key
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = input.value.trim();
      if (value) {
        onSubmit(value);
        input.remove();
      } else {
        input.remove();
        selectEl.value = "";
      }
    }
  });

  // Handle blur (cancel)
  input.addEventListener("blur", () => {
    if (!input.value.trim()) {
      input.remove();
      selectEl.value = "";
    }
  });
}

// Plan selector behavior
// Plan selector behavior + activity logging
planSelect.addEventListener("change", async () => {

  // CASE 1 — User chooses "__new__"
  if (planSelect.value === "__new__") {
    const newPlan = prompt("Enter new Plan name:");
    if (newPlan && newPlan.trim()) {
      const clean = newPlan.trim();

      const opt = document.createElement("option");
      opt.value = clean;
      opt.textContent = clean;

      planSelect.insertBefore(opt, planSelect.lastElementChild);
      planSelect.value = clean;

      console.log("🆕 Added new plan:", clean);

      // 🟢 Log new plan added
      await logActivity("Plan Added", clean);

    } else {
      planSelect.value = "";
    }
    return;
  }

  // CASE 2 — Normal change
  const val = planSelect.value;
  console.log("📄 Plan changed to:", val);

  // 🟢 Log plan updated
  await logActivity("Plan Updated", val);
});


// Elevation selector behavior + activity logging
elevationSelect.addEventListener("change", async () => {

  // CASE 1 — Adding a new elevation
  if (elevationSelect.value === "__new__") {
    const newEle = prompt("Enter new Elevation name:");
    if (newEle && newEle.trim()) {
      const clean = newEle.trim();

      const opt = document.createElement("option");
      opt.value = clean;
      opt.textContent = clean;

      elevationSelect.insertBefore(opt, elevationSelect.lastElementChild);
      elevationSelect.value = clean;

      console.log("🆕 Added new elevation:", clean);

      // 🟢 Activity log
      await logActivity("Elevation Added", clean);

    } else {
      elevationSelect.value = "";
    }
    return;
  }

  // CASE 2 — Normal elevation changed
  const val = elevationSelect.value;
  console.log("📄 Elevation changed to:", val);

  // 🟢 Log update
  await logActivity("Elevation Updated", val);
});




// ------------------------- PATCH BACK (Builder record) -------------------------
async function updateBuilderFields(builderId, planText, elevationText) {
  // 1) Fetch latest
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

  // 2) Parse JSON safely
  let currentJSON = { plans: [], elevations: [] };
  try {
    if (data.fields["PlanElevationJSON"]) {
      currentJSON = JSON.parse(data.fields["PlanElevationJSON"]);
    }
  } catch {
    console.warn("⚠️ Bad JSON, starting fresh");
  }

  // 3) Merge
  const updatedPlans = Array.from(new Set([...(currentJSON.plans || []), planText]));
  const updatedElevations = Array.from(new Set([...(currentJSON.elevations || []), elevationText]));

  // 4) Patch
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

  // 5) Refresh UI
  await populatePlanElevation(builderSelect);
}

// ------------------------- COMMUNITIES (FILTER BY BUILDER REC ID) -------------------------

async function populateCommunityDropdownByBuilderId(builderRecId) {
  if (!communitySelect) return;

  console.group(`🏡 populateCommunityDropdownByBuilderId(${builderRecId})`);

  communitySelect.innerHTML = `<option value="">Loading Communities...</option>`;

  let records = [];
  try {
    console.log("📡 Fetching communities from TAKEOFFS table...");
    records = await fetchCommunitiesByBuilderId(builderRecId);
    console.log(`📦 Airtable returned ${records.length} records`);
  } catch (err) {
    console.error("❌ Failed to fetch communities:", err);
    communitySelect.innerHTML = `<option value="">Failed to load communities</option>`;
    console.groupEnd();
    return;
  }

  console.log("🔍 Raw records:");
  records.forEach((rec, i) => console.log(i + 1, rec.fields));

  // Correct field name
  const names = records
    .map(r => {
      const value = r.fields["Community Name"];
      console.log("➡️ Community Name:", value);
      return value ? value.trim() : "";
    })
    .filter(Boolean);

  console.log("🧪 Extracted community names:", names);

  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b));

  communitySelect.innerHTML = `<option value="">Select Community</option>`;

  if (unique.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No communities found for this builder";
    communitySelect.appendChild(opt);
    console.log("⚠️ No communities found");
    console.groupEnd();
    return;
  }

  unique.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    communitySelect.appendChild(opt);
    console.log("📥 Added:", name);
  });

  console.log(`✅ Populated ${unique.length} communities.`);
  console.groupEnd();
}

async function populateCommunityDropdownByBuilderName(builder) {
  if (!communitySelect) return;

  console.group("🏡 populateCommunityDropdownByBuilderName()");
  console.log("📄 Full builder record:", builder);

  const builderName = (builder.fields["Client Name"] || "").trim();
  console.log("🔤 Builder Name:", builderName);

  if (!builderName) {
    console.warn("⚠️ No builder name found");
    communitySelect.innerHTML = `<option value="">Select a builder</option>`;
    console.groupEnd();
    return;
  }

  // Use FIND() to match builder NAME inside the “Builder” field in the Communities table
  const formula = `FIND("${builderName}", {Builder})`;
  console.log("🔎 Formula:", formula);

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TAKEOFFS_TABLE_ID}?pageSize=100&filterByFormula=${encodeURIComponent(formula)}`;
  console.log("🌐 URL:", url);

  let data;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    data = await res.json();
  } catch (err) {
    console.error("❌ Failed to fetch:", err);
    communitySelect.innerHTML = `<option value="">Error loading</option>`;
    return;
  }

  const records = data.records || [];
  console.log(`📦 Returned ${records.length} communities`);

  console.log("🔍 Raw community rows:");
  records.forEach(r => console.log(r.fields));

  const names = records
    .map(r => (r.fields["Community Name"] || "").trim())
    .filter(Boolean);

  console.log("🧪 Extracted names:", names);

  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  console.log("🧹 Unique:", unique);

  // Populate dropdown
  communitySelect.innerHTML = `<option value="">Select Community</option>`;

  if (unique.length === 0) {
    communitySelect.innerHTML = `<option>No communities found</option>`;
    console.groupEnd();
    return;
  }

  unique.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    communitySelect.appendChild(opt);
  });

  console.log("✅ Dropdown populated");
  console.groupEnd();
}

// ------------------------- EVENTS & INIT -------------------------
function wireEventsOnce() {
  if (!builderSelect || !saveBtn) {
    console.error("❌ Missing required elements:", {
      builderSelect: !!builderSelect,
      saveBtn: !!saveBtn,
    });
    return;
  }

  builderSelect.onchange = async () => {
    console.log("📤 Builder changed → repopulating plans/elevations & communities");
    await populatePlanElevation(builderSelect);

    // Resolve the selected builder to its record (from Builders table)
    let builderRecords = [];
    try {
      builderRecords = await fetchBuilderRecords();
    } catch (err) {
      console.error("❌ Failed to fetch builders (for communities):", err);
      communitySelect.innerHTML = `<option value="">Failed to load communities</option>`;
      return;
    }
   const builder = findBuilderRecord(builderRecords, builderSelect);
if (builder) {
  await populateCommunityDropdownByBuilderName(builder);
} else {
  communitySelect.innerHTML = `<option value="">Select a builder first</option>`;
}

  };

  saveBtn.onclick = async () => {
    console.log("💾 Save button clicked");
    let records = [];
    try {
      records = await fetchBuilderRecords();
    } catch (err) {
      console.error("❌ Failed to fetch builders (save click):", err);
      alert("Could not load builders from Airtable. Check console for details.");
      return;
    }

    const builder = findBuilderRecord(records, builderSelect);
    if (!builder) {
      alert("⚠️ No matching builder found.\n\nMake sure the 'Client Name' in Airtable exactly matches the selected builder name.");
      return;
    }

    let planText = planSelect.value;
    let elevationText = elevationSelect.value;

    if (planText === "__new__") planText = prompt("Enter new Plan name:") || "";
    if (elevationText === "__new__") elevationText = prompt("Enter new Elevation name:") || "";

    if (!planText.trim() || !elevationText.trim()) {
  
    }

    try {
      console.log("📡 Patching to Airtable with:", planText, elevationText);
      await updateBuilderFields(builder.id, planText.trim(), elevationText.trim());
      await populatePlanElevation(builderSelect);
      console.log("✅ Refresh complete after update");
    } catch (err) {
      console.error("❌ Failed to update builder:", err);
      alert("Update failed — see console for details.");
    }
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    wireEventsOnce();
    await populateBuilderDropdown(); // builders first (from Builders table)

    // If a builder is already selected (reload), hydrate plan/elevation and communities
    if (builderSelect && builderSelect.value) {
      await populatePlanElevation(builderSelect);
      const bRecs = await fetchBuilderRecords();
      const b = findBuilderRecord(bRecs, builderSelect);
      if (b) await populateCommunityDropdownByBuilderId(b.id);
    } else {
      // UX: show placeholder until builder selected
      communitySelect.innerHTML = `<option value="">Select a builder first</option>`;
    }
  } catch (err) {
    console.error("❌ Initialization error:", err);
  }
});
