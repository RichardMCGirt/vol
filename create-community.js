document.addEventListener("DOMContentLoaded", async () => {
  console.log("🏗️ Create Community Script Loaded");

  // Airtable config
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const BUILDERS_TABLE_ID = "tblDkASnuImCKBQyO"; // same as builder.js
  const COMMUNITIES_TABLE_ID = "tblYIxFxH2swiBZiI";

  const builderSelect = document.getElementById("community-builder");
  const modal = document.getElementById("community-modal");
  const openBtn = document.getElementById("open-community-modal");
  const closeBtn = document.getElementById("close-community-modal");
  const form = document.getElementById("community-form");

  // 🌐 Fetch builder names
  async function fetchBuilders(offset = null, builders = []) {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${BUILDERS_TABLE_ID}?pageSize=100`;
    if (offset) url += `&offset=${offset}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const newBuilders = data.records
      .map(r => r.fields["Client Name"])
      .filter(Boolean);

    builders.push(...newBuilders);

    if (data.offset) return fetchBuilders(data.offset, builders);
    return builders;
  }

  // 🧩 Populate dropdown
  async function populateBuilderDropdown() {
    try {
      console.log("📡 Fetching builders...");
      const builderNames = await fetchBuilders();
      const uniqueBuilders = [...new Set(builderNames)].sort();

      builderSelect.innerHTML = '<option value="">Select Builder</option>';
      uniqueBuilders.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        builderSelect.appendChild(opt);
      });

      console.log(`✅ Loaded ${uniqueBuilders.length} builders`);
    } catch (err) {
      console.error("❌ Error loading builders:", err);
      builderSelect.innerHTML =
        '<option>Error loading builders</option>';
    }
  }

  // 🪟 Modal controls
  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    populateBuilderDropdown(); // fetch live when opened
  });

if (closeBtn && modal) {
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
}

  // 📝 Form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nameEl = document.getElementById("communityName");
  const planEl = document.getElementById("planName");
  const builderEl = document.getElementById("community-builder");
  const startDateEl = document.getElementById("startDate");
  const estimatedCompletionEl = document.getElementById("estimatedCompletion");

  if (!nameEl || !builderEl || !planEl) {
    console.error("❌ Required input elements not found in the DOM.");
    alert("Form not loaded properly. Please refresh the page.");
    return;
  }

  const name = nameEl.value.trim();
  const plan = planEl.value.trim();
  const builder = builderEl.value.trim();
  const startDate = startDateEl?.value || "";
  const estimatedCompletion = estimatedCompletionEl?.value || "";

  console.log("🧩 Submitting data to Airtable:", {
    "Community Name": name,
    "Plan name": plan,
    "Builder": builder,
    "Start Date": startDate,
    "Estimated Completion": estimatedCompletion,
  });

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/appnZNCcUAJCjGp7L/tblYIxFxH2swiBZiI`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            "Community Name": name,
            "Plan name": plan,
            "Builder": builder,
            "Start Date": startDate,
            "Estimated Completion": estimatedCompletion,
          },
        }),
      }
    );

    const text = await response.text();
    console.log("📥 Airtable raw response:", text);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    alert("✅ Community created successfully!");
    form.reset();
    modal.classList.add("hidden");
  } catch (err) {
    console.error("❌ Error creating community:", err);
    alert("Failed to create community. Please check the console for details.");
  }
});

});
