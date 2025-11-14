document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Login script initialized.");

  const form = document.getElementById("login-form");
  const errorMsg = document.getElementById("error-message");

  // Airtable config - unified base
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appnZNCcUAJCjGp7L";
  const TABLE_ID = "tblfSrIrImd28RpAD";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📨 Form submitted.");

    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    console.log("🧾 Entered email:", email);
    console.log("🔑 Entered password:", password ? "[provided]" : "[empty]");

    if (!email || !password) {
      errorMsg.textContent = "Please enter both email and password.";
      errorMsg.classList.remove("hidden");
      return;
    }

    try {
      const filter = encodeURIComponent(`{email}='${email}'`);
      const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${filter}`;

      console.log("🌐 Fetching:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) throw new Error(`Airtable API returned ${response.status}`);

      const data = await response.json();
      console.log("📦 Raw Airtable response:", data);

      if (data.records.length === 0) {
        console.warn("❌ No user found for email:", email);
        errorMsg.textContent = "Email not found.";
        errorMsg.classList.remove("hidden");
        return;
      }

      const record = data.records[0];
      const user = record.fields;

      console.log("🆔 Record ID:", record.id);
      console.log("🧩 Full fields:", user);

      const fieldNames = Object.keys(user);
      console.log("📄 Field names:", fieldNames);

      console.log("📌 user.email:", user.email);
      console.log("📌 user.password:", user.password);

      // ---------------------------
      // Normalize password input
      // ---------------------------
      let storedPassword = user.password;

      // ARRAY → convert to string
      if (Array.isArray(storedPassword)) {
        console.warn("⚠️ Password field is an ARRAY:", storedPassword);
        storedPassword = storedPassword.join("").trim();
      }

      // If empty and Password 2 exists → use it
      if ((!storedPassword || storedPassword.length === 0) && user["Password 2"]) {
        console.log("ℹ️ Using 'Password 2' fallback.");
        storedPassword = user["Password 2"].trim();
      }

      console.log("🔐 Final storedPassword:", storedPassword);

      if (!storedPassword) {
        console.warn("❌ No valid password field found.");
        errorMsg.textContent = "User account missing password.";
        errorMsg.classList.remove("hidden");
        return;
      }

      // ---------------------------
      // Password comparison
      // ---------------------------
      if (storedPassword === password.trim()) {
        console.log("✅ Password match for:", user.email);

        localStorage.setItem("loggedInUser", user.email);
        localStorage.setItem("userRecordId", record.id);

        console.log("💾 Session stored → redirecting...");
        // ------------------------------
// Save Login Timestamp to Airtable
// ------------------------------
const loginTimestamp = new Date().toISOString();

let loginHistory = [];
try {
  loginHistory = user["Login History"] ? JSON.parse(user["Login History"]) : [];
} catch (e) {
  console.warn("⚠️ Could not parse existing Login History.");
}

loginHistory.push(loginTimestamp);

await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${record.id}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fields: {
      "Last Login": loginTimestamp,
      "Login History": JSON.stringify(loginHistory)
    }
  }),
});

console.log("📝 Login timestamp saved to Airtable:", loginTimestamp);

console.log("⏳ Waiting 3 seconds before redirect so you can read patch logs...");

setTimeout(() => {
  window.location.href = "index.html";
}, 3000);

      } else {
        console.warn("❌ Password mismatch. Entered:", password, "Expected:", storedPassword);
        errorMsg.textContent = "Invalid password.";
        errorMsg.classList.remove("hidden");
      }

    } catch (err) {
      console.error("🔥 Login error:", err);
      errorMsg.textContent = "An error occurred while logging in. Please try again.";
      errorMsg.classList.remove("hidden");
    }
  });
});
