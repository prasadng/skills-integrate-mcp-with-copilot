document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  const filterCategory = document.getElementById("filter-category");
  const sortBy = document.getElementById("sort-by");
  const searchText = document.getElementById("search-text");
  const clearFiltersBtn = document.getElementById("clear-filters");

  // Store fetched activities for client-side filtering/sorting
  let allActivities = [];

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Convert activities object to array for easier processing
      allActivities = Object.entries(activities).map(([name, details]) => ({
        name,
        ...details,
      }));

      // Populate category filter options
      populateCategoryOptions(allActivities);

      // Populate activity select for signup
      populateActivitySelect(allActivities);

      // Render activities with current filters
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function populateCategoryOptions(activities) {
    const categories = Array.from(
      new Set(activities.map((a) => a.category).filter(Boolean))
    ).sort();

    // Clear existing options except the default
    filterCategory.innerHTML = "<option value=\"\">All categories</option>";

    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      filterCategory.appendChild(opt);
    });
  }

  function populateActivitySelect(activities) {
    // Clear existing options except placeholder
    activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";
    activities.forEach((a) => {
      const option = document.createElement("option");
      option.value = a.name;
      option.textContent = a.name;
      activitySelect.appendChild(option);
    });
  }

  function renderActivities() {
    activitiesList.innerHTML = "";

    let items = allActivities.slice();

    // Apply category filter
    const selectedCategory = filterCategory.value;
    if (selectedCategory) {
      items = items.filter((a) => a.category === selectedCategory);
    }

    // Apply search filter (name or description)
    const q = (searchText.value || "").trim().toLowerCase();
    if (q) {
      items = items.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
      );
    }

    // Apply sorting
    const sortVal = sortBy.value;
    if (sortVal === "name-asc") {
      items.sort((x, y) => x.name.localeCompare(y.name));
    } else if (sortVal === "name-desc") {
      items.sort((x, y) => y.name.localeCompare(x.name));
    } else if (sortVal === "spots-asc") {
      items.sort(
        (x, y) =>
          (x.max_participants - (x.participants || []).length) -
          (y.max_participants - (y.participants || []).length)
      );
    } else if (sortVal === "spots-desc") {
      items.sort(
        (x, y) =>
          (y.max_participants - (y.participants || []).length) -
          (x.max_participants - (x.participants || []).length)
      );
    }

    if (items.length === 0) {
      activitiesList.innerHTML = "<p>No activities match your filters.</p>";
      return;
    }

    items.forEach((details) => {
      const name = details.name;
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants && details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p class="category"><strong>Category:</strong> ${details.category || "—"}</p>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    // Re-attach delete handlers
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Filter control events
  filterCategory.addEventListener("change", renderActivities);
  sortBy.addEventListener("change", renderActivities);
  searchText.addEventListener("input", () => {
    // debounce simple
    clearTimeout(searchText._timer);
    searchText._timer = setTimeout(renderActivities, 200);
  });
  clearFiltersBtn.addEventListener("click", (e) => {
    e.preventDefault();
    filterCategory.value = "";
    sortBy.value = "name-asc";
    searchText.value = "";
    renderActivities();
  });

  // Initialize app
  fetchActivities();
});
