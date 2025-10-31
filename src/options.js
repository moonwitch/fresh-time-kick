// 'configDefaults' is now loaded from config.js

// --- Wait for the DOM to be fully loaded before running anything ---
document.addEventListener("DOMContentLoaded", () => {
  // --- Get references to DOM elements ---
  const elements = {
    domainInput: document.getElementById("domain"),
    apiKeyInput: document.getElementById("apikey"),
    emailInput: document.getElementById("email"),
    minutesInput: document.getElementById("minutes"),
    noteInput: document.getElementById("note"),
    billableCheckbox: document.getElementById("billable"),
    donotnoteCheckbox: document.getElementById("donotnote"), // <-- ADD THIS
    saveButton: document.getElementById("save"),
    statusSpan: document.getElementById("status"),
  };

  // --- Load saved settings ---
  function load() {
    chrome.storage.sync.get(configDefaults, (items) => {
      // API
      if (elements.domainInput) elements.domainInput.value = items.fsDomain;
      if (elements.apiKeyInput) elements.apiKeyInput.value = items.fsApiKey;
      if (elements.emailInput) elements.emailInput.value = items.email;

      // Defaults
      if (elements.minutesInput)
        elements.minutesInput.value = items.defaultMinutes;
      if (elements.noteInput) elements.noteInput.value = items.defaultNote;
      if (elements.billableCheckbox)
        elements.billableCheckbox.checked = items.defaultBillable;
      if (elements.donotnoteCheckbox)
        elements.donotnoteCheckbox.checked = items.doNotAddNote;
    });
  }

  // --- Save settings ---
  function save() {
    const newDomain = elements.domainInput
      ? elements.domainInput.value
          .trim()
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "")
      : "";
    const newApiKey = elements.apiKeyInput
      ? elements.apiKeyInput.value.trim()
      : "";
    const newEmail = elements.emailInput
      ? elements.emailInput.value.trim()
      : "";
    const newMinutes = elements.minutesInput
      ? parseInt(elements.minutesInput.value, 10)
      : configDefaults.defaultMinutes;
    const newNote = elements.noteInput
      ? elements.noteInput.value
      : configDefaults.defaultNote;
    const newBillable = elements.billableCheckbox
      ? elements.billableCheckbox.checked
      : configDefaults.defaultBillable;
    const newDoNotAddNote = elements.donotnoteCheckbox
      ? elements.donotnoteCheckbox.checked
      : false;

    chrome.storage.sync.get(configDefaults, (items) => {
      const data = {
        fsDomain: newDomain,
        fsApiKey: newApiKey,
        email: newEmail,
        defaultMinutes: newMinutes || configDefaults.defaultMinutes,
        defaultNote: newNote || configDefaults.defaultNote,
        defaultBillable: newBillable,
        doNotAddNote: newDoNotAddNote,
      };

      // Clear cached agentId if credentials changed
      if (
        newDomain !== items.fsDomain ||
        newApiKey !== items.fsApiKey ||
        newEmail !== items.email
      ) {
        data.agentId = null;
      }

      chrome.storage.sync.set(data, () => {
        if (elements.statusSpan) {
          elements.statusSpan.textContent = "Saved.";
          setTimeout(() => {
            if (elements.statusSpan) elements.statusSpan.textContent = "";
          }, 1200);
        }
      });
    });
  }

  // --- Attach event listener ---
  if (elements.saveButton) {
    elements.saveButton.addEventListener("click", save);
  } else {
    console.error("Save button not found!"); // Add error logging
  }

  // --- Initial load ---
  load();
}); // End of DOMContentLoaded listener
