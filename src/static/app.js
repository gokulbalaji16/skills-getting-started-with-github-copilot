document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let messageTimeout;

  function showMessage(message, type) {
    clearTimeout(messageTimeout);
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageTimeout = setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error(`Could not load activities (${response.status})`);
      }
      const activities = await response.json();
      const selectedActivity = activitySelect.value;

      activitiesList.replaceChildren();
      activitySelect.replaceChildren(new Option("-- Select an activity --", ""));

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const title = document.createElement("h4");
        title.textContent = name;
        const description = document.createElement("p");
        description.textContent = details.description;
        const schedule = document.createElement("p");
        const scheduleLabel = document.createElement("strong");
        scheduleLabel.textContent = "Schedule: ";
        schedule.append(scheduleLabel, details.schedule);
        const availability = document.createElement("p");
        const availabilityLabel = document.createElement("strong");
        availabilityLabel.textContent = "Availability: ";
        const spotsLeft = details.max_participants - details.participants.length;
        availability.append(availabilityLabel, `${spotsLeft} spots left`);

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants";
        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("li");
          emptyMessage.className = "participants-empty";
          emptyMessage.textContent = "No participants yet.";
          participantsList.appendChild(emptyMessage);
        }

        details.participants.forEach((email) => {
          const participant = document.createElement("li");
          const participantEmail = document.createElement("span");
          participantEmail.textContent = email;
          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "remove-participant";
          removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
          removeButton.textContent = "\u00d7";
          removeButton.addEventListener("click", () => unregister(name, email, removeButton));
          participant.append(participantEmail, removeButton);
          participantsList.appendChild(participant);
        });

        activityCard.append(title, description, schedule, availability, participantsHeading, participantsList);
        activitiesList.appendChild(activityCard);
        activitySelect.appendChild(new Option(name, name));
      });

      activitySelect.value = selectedActivity;
    } catch (error) {
      activitiesList.textContent = "Failed to load activities. Please try again later.";
      console.error("Error fetching activities:", error);
    }
  }

  async function unregister(activity, email, button) {
    button.disabled = true;
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "Failed to unregister participant.", "error");
        return;
      }
      showMessage(result.message, "success");
      await fetchActivities();
    } catch (error) {
      showMessage("Failed to unregister participant. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    } finally {
      button.disabled = false;
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = activitySelect.value;
    const submitButton = signupForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      showMessage(result.message, "success");
      signupForm.reset();
      await fetchActivities();
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  fetchActivities();
});
