// ------------------------- CONFIG -------------------------
const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
const BASE_ID = "appnZNCcUAJCjGp7L";

// ⭐ The correct table for Takeoff List
const TAKEOFFS_TABLE_ID = "tblZpnyqHJeC1IaZq";

// Target table body in takeoff.html
const tableBody = document.getElementById("takeoff-table");

if (!tableBody) {
  console.error("❌ Missing #takeoff-table in takeoff.html");
}

// ------------------------- FETCH TAKEOFFS -------------------------
async function fetchTakeoffs() {
  let records = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TAKEOFFS_TABLE_ID}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!res.ok) {
      console.error("❌ Error fetching takeoffs:", await res.text());
      return [];
    }

    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;

  } while (offset);

  console.log(`📦 Loaded ${records.length} takeoff records from tblZpnyqHJeC1IaZq`);
  return records;
}

// ------------------------- FORMATTERS -------------------------
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(num) {
  const v = parseFloat(num);
  return isNaN(v) ? "$0.00" : `$${v.toLocaleString()}`;
}

// ------------------------- RENDER ROW -------------------------
function renderRow(rec) {
  const f = rec.fields;
  const id = rec.id;

  const active = f["Active"] === true;
  const type = f["Type"] || "";
  const builder = f["Builder"] || "";
  const community = f["Community"] || "";
  const division = f["Division (from Name)"] || "";
  const status = f["Status"] || "Draft";

  const totalCost = f["Total cost"] || 0;
  const margin = f["Margin"] || 0;

  const updated = formatDate(f["Last updated"]);
  const updatedBy = f["Last Modified by"] || "";

  const takeoffName =
    f["Takeoff Creation"] || f["Takeoff Creation 2"] || "Untitled";

  return `
    <tr data-id="${id}">
      <td class="py-3 px-3">
        <input type="checkbox">
      </td>

      <!-- ✅ Click to toggle active -->
      <td class="py-3 px-3">
        <div class="w-3 h-3 rounded-full mx-auto cursor-pointer active-toggle ${active ? "bg-green-500" : "bg-gray-300"}"></div>
      </td>

      <td class="py-3 px-3">
        <div class="font-semibold text-gray-800">${takeoffName}</div>
        <div class="text-xs text-gray-500">${division}</div>
      </td>

      <td class="py-3 px-3">
        <span class="px-2 py-1 bg-black text-white text-xs rounded-md">${type}</span>
      </td>

      <td class="py-3 px-3">
        <div class="font-medium">${builder}</div>
        <div class="text-xs text-gray-500">${community}</div>
      </td>

      <!-- ✅ Editable Status Dropdown -->
      <td class="py-3 px-3">
        <select class="status-select border rounded px-2 py-1 text-xs">
          <option value="Complete" ${status === "Complete" ? "selected" : ""}>Complete</option>
          <option value="Draft" ${status === "Draft" ? "selected" : ""}>Draft</option>
        </select>
      </td>

      <td class="py-3 px-3 text-right">${formatMoney(totalCost)}</td>

      <td class="py-3 px-3 text-right text-orange-600 font-medium">
        ${margin}%
      </td>

      <td class="py-3 px-3 text-right">
        <div>${updated}</div>
        <div class="text-xs text-gray-500">by ${updatedBy}</div>
      </td>

      <td class="py-3 px-3 text-right">⋮</td>
    </tr>
  `;
}
function enableRowInteractions() {
  document.querySelectorAll(".active-toggle").forEach(dot => {
    dot.addEventListener("click", () => {
      const row = dot.closest("tr");
      const recId = row.dataset.id;
      const isActive = dot.classList.contains("bg-green-500");

      const newValue = !isActive;
      dot.classList.toggle("bg-green-500", newValue);
      dot.classList.toggle("bg-gray-300", !newValue);

      updateTakeoff(recId, { Active: newValue });
    });
  });

  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", () => {
      const row = sel.closest("tr");
      const recId = row.dataset.id;
      const newStatus = sel.value;

      updateTakeoff(recId, { Status: newStatus });
    });
  });
}

async function updateTakeoff(recordId, fields) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TAKEOFFS_TABLE_ID}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!res.ok) {
    console.error("❌ Error updating Airtable:", await res.text());
    alert("Update failed. See console.");
  } else {
    console.log("✅ Updated:", fields);
  }
}

// ------------------------- MAIN RENDER FUNCTION -------------------------
async function populateTakeoffTable() {
  tableBody.innerHTML = `...loading...`;

  const records = await fetchTakeoffs();

  tableBody.innerHTML = records.map(renderRow).join("");

  // ⭐ Enable click + dropdown editing
  enableRowInteractions();

  console.log("✅ Takeoff table populated");
}


// ------------------------- INIT -------------------------
document.addEventListener("DOMContentLoaded", populateTakeoffTable);
