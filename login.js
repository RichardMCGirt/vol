document.addEventListener("DOMContentLoaded", () => {
      console.log("🚀 Login script initialized.");

  const form = document.getElementById("login-form");
  const errorMsg = document.getElementById("error-message");

  // 🔧 Replace these with your Airtable details
  const AIRTABLE_API_KEY = "pat6QyOfQCQ9InhK4.4b944a38ad4c503a6edd9361b2a6c1e7f02f216ff05605f7690d3adb12c94a3c";
  const BASE_ID = "appD3QeLneqfNdX12";
  const TABLE_ID = "tbljmLpqXScwhiWTt"; // Table should contain fields: Username, Password

    form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📨 Form submitted.");

    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    console.log("🧾 Entered email:", email);
    console.log("🔑 Entered password (hidden for security):", password ? "[provided]" : "[empty]");

    if (!email || !password) {
      console.warn("⚠️ Missing email or password.");
      errorMsg.textContent = "Please enter both email and password.";
      errorMsg.classList.remove("hidden");
      return;
    }

    try {
      // Construct filterByFormula for Airtable
      const filter = encodeURIComponent(`{email}='${email}'`);
      const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${filter}`;

      console.log("🌐 Fetching user data from Airtable:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      console.log("📡 Airtable response status:", response.status);

      if (!response.ok) throw new Error(`Airtable API returned ${response.status}`);

      const data = await response.json();
      console.log("📦 Airtable returned records:", data.records.length);

      if (data.records.length === 0) {
        console.warn("❌ No user found for email:", email);
        errorMsg.textContent = "Email not found.";
        errorMsg.classList.remove("hidden");
        return;
      }

      const user = data.records[0].fields;
     console.log("👤 User record found:", user.email);

if (user.password === password) {
  console.log("✅ Password match. Logging in user:", user.email);

  localStorage.setItem("loggedInUser", user.email);
  localStorage.setItem("userRecordId", data.records[0].id);


        console.log("💾 Stored session in localStorage. Redirecting to index.html...");
        window.location.href = "index.html";
      } else {
        console.warn("❌ Password mismatch for:", email);
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