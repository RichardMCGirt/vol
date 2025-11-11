// login.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorMsg = document.getElementById("error-message");

  // 🔧 Replace these with your Airtable details
  const AIRTABLE_API_KEY = "YOUR_AIRTABLE_API_KEY";
  const BASE_ID = "YOUR_BASE_ID";
  const TABLE_ID = "YOUR_TABLE_ID"; // Table should contain fields: Username, Password

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      errorMsg.textContent = "Please enter both username and password.";
      errorMsg.classList.remove("hidden");
      return;
    }

    try {
      // 🔍 Fetch all user records from Airtable
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula={Username}='${username}'`, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`
        }
      });

      if (!response.ok) throw new Error("Error fetching user data.");

      const data = await response.json();

      if (data.records.length === 0) {
        errorMsg.textContent = "User not found.";
        errorMsg.classList.remove("hidden");
        return;
      }

      const user = data.records[0].fields;

      // 🧠 Compare password (plaintext for now — you can hash later)
      if (user.Password === password) {
        // ✅ Save login session
        localStorage.setItem("loggedInUser", username);

        // Redirect to dashboard
        window.location.href = "index.html";
      } else {
        errorMsg.textContent = "Invalid username or password.";
        errorMsg.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Login error:", err);
      errorMsg.textContent = "An error occurred while logging in.";
      errorMsg.classList.remove("hidden");
    }
  });
});
