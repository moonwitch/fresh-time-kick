// popup.js

// --- Global Elements ---
let elements = {};

// --- Helpers ---
function toHHMM(mins) {
  const h = Math.floor(mins / 60),
    m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? "red" : "#555";
}

// --- API Function 1: Agent ID ---
async function getAgentId(config) {
  if (config.agentId) return config.agentId;
  setStatus("Fetching agent details...");
  const authHeader = `Basic ${btoa(config.fsApiKey + ":X")}`;
  const encodedEmail = encodeURIComponent(`'${config.email}'`);
  const query = `"email:${encodedEmail}"`;
  const apiUrl = `https://${config.fsDomain}/api/v2/agents?query=${query}`;
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Auth failed. Check API Key/Domain.");
    const data = await response.json();
    if (data.agents && data.agents.length > 0) {
      const agentId = data.agents[0].id;
      chrome.storage.sync.set({ agentId: agentId });
      return agentId;
    } else {
      throw new Error(`Email '${config.email}' not found.`);
    }
  } catch (e) {
    setStatus(e.message, true);
    return null;
  }
}

// --- API Function 2: Log Time ---
async function callLogTimeAPI(config, ticketId, minutesToLog, note, billable) {
  const apiUrl = `https://${config.fsDomain}/api/v2/tickets/${ticketId}/time_entries`;
  const timeString = toHHMM(minutesToLog);
  const authHeader = `Basic ${btoa(config.fsApiKey + ":X")}`;
  const body = JSON.stringify({
    time_entry: {
      time_spent: timeString,
      note: note,
      billable: billable,
      agent_id: config.agentId,
    },
  });
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: body,
  });
  if (!response.ok) throw new Error("Log Time failed (API error)");
  return await response.json();
}

// --- API Function 3: Update Status ---
async function callUpdateStatusAPI(config, ticketId, newStatus) {
  const apiUrl = `https://${config.fsDomain}/api/v2/tickets/${ticketId}`;
  const authHeader = `Basic ${btoa(config.fsApiKey + ":X")}`;
  const body = JSON.stringify({
    status: parseInt(newStatus, 10),
  });
  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: body,
  });
  if (!response.ok) throw new Error("Update Status failed (API error)");
  return await response.json();
}

// --- API Function 4: Add Note ---
async function callAddNoteAPI(config, ticketId, note, isPrivate) {
  const apiUrl = `https://${config.fsDomain}/api/v2/tickets/${ticketId}/notes`;
  const authHeader = `Basic ${btoa(config.fsApiKey + ":X")}`;
  const body = JSON.stringify({
    body: note,
    private: isPrivate,
  });
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: body,
  });
  if (!response.ok) throw new Error("Add Note failed (API error)");
  return await response.json();
}

// --- Error Handler ---
async function handleApiError(error) {
  let errorMessage = error.message;
  // Try to parse a JSON error from the API
  try {
    const errorData = JSON.parse(error.message);
    if (errorData.errors && errorData.errors.length > 0) {
      const firstError = errorData.errors[0];
      errorMessage = `Validation Failed: ${firstError.field} (${firstError.message})`;
    } else {
      errorMessage = errorData.description || "API Error";
    }
    console.error("FS API Error (JSON):", errorData);
  } catch (e) {
    // Not a JSON error, just show the message
    console.error("FS API Error (Not JSON):", error.message);
  }
  setStatus(errorMessage, true);
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  // Store all elements for easy access
  elements = {
    submitBtn: document.getElementById("submit-btn"),
    status: document.getElementById("status"),

    // Time (always active)
    minutesInput: document.getElementById("minutes-input"),
    noteInput: document.getElementById("note-input"),
    billableCheck: document.getElementById("billable-check"),
    publicNoteRow: document.getElementById("public-note-row"),
    noteIsPublicCheck: document.getElementById("note-is-public-check"),

    // Status (optional)
    doUpdateStatus: document.getElementById("do-update-status"),
    statusFieldset: document.getElementById("status-fieldset"),
    statusSelect: document.getElementById("status-select"),
  };

  // 1. Load defaults into the form
  chrome.storage.sync.get(configDefaults, (config) => {
    elements.minutesInput.value = config.defaultMinutes;
    elements.noteInput.value = config.defaultNote;
    elements.billableCheck.checked = config.defaultBillable;
    elements.statusSelect.value = config.defaultStatus;

    // Set initial disabled state for Status fieldset
    elements.statusFieldset.disabled = true; // Start disabled
    elements.doUpdateStatus.checked = false; // Start unchecked

    // Set note privacy defaults
    elements.noteIsPublicCheck.checked = false; // Default to private

    // Hide the public note option if notes are disabled globally
    if (config.doNotAddNote) {
      elements.publicNoteRow.style.display = "none";
    }
  });

  // 2. Event listeners for toggling fieldsets

  // This listener auto-enables the Status section when you change the dropdown
  elements.statusSelect.addEventListener("change", () => {
    elements.doUpdateStatus.checked = true;
    elements.statusFieldset.disabled = false;
  });
  // This listener allows manual toggling
  elements.doUpdateStatus.addEventListener("change", (e) => {
    elements.statusFieldset.disabled = !e.target.checked;
  });

  // 3. Main submit button logic
  elements.submitBtn.addEventListener("click", async () => {
    elements.submitBtn.disabled = true;
    setStatus("Starting...");

    try {
      // --- 1. Get config ---
      const config = await new Promise((resolve) =>
        chrome.storage.sync.get(configDefaults, resolve),
      );

      // --- 2. Basic config validation ---
      let missing = [];
      if (!config.fsDomain) missing.push("Domain");
      if (!config.fsApiKey) missing.push("API Key");
      if (!config.email) missing.push("Email");
      if (missing.length > 0) {
        throw new Error(`Config missing: ${missing.join(", ")}`);
      }

      // --- 3. Get values from the form ---
      const doUpdateStatus = elements.doUpdateStatus.checked;
      const doAddNote = !config.doNotAddNote; // <-- Use global config setting
      const isPublicNote = elements.noteIsPublicCheck.checked; // <-- Read privacy checkbox

      const minutesToLog = parseInt(elements.minutesInput.value, 10);
      const note = elements.noteInput.value.trim();
      const billable = elements.billableCheck.checked;
      const newStatus = elements.statusSelect.value;

      // --- 4. Action-specific validation ---
      // Log Time is always active, so we always validate its fields
      if (note === "") {
        throw new Error("Note cannot be empty.");
      }
      if (!minutesToLog || minutesToLog < 1) {
        throw new Error("Invalid minutes.");
      }

      // --- 5. Get Agent ID & Ticket ID ---
      const agentId = await getAgentId(config);
      if (!agentId) return; // Error already set by getAgentId
      config.agentId = agentId;

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const urlMatch = tab.url.match(/\/tickets\/(\d+)/);
      if (!urlMatch || !urlMatch[1]) {
        throw new Error("Not on a ticket URL.");
      }
      const ticketId = urlMatch[1];

      // --- 6. Build and run API calls ---
      setStatus("Submitting actions...");
      const apiPromises = [];

      // Log Time always runs
      apiPromises.push(
        callLogTimeAPI(config, ticketId, minutesToLog, note, billable),
      );

      if (doUpdateStatus) {
        apiPromises.push(callUpdateStatusAPI(config, ticketId, newStatus));
      }
      if (doAddNote) {
        // Use the checkbox to determine privacy.
        // isPrivate = !isPublicNote
        const isPrivate = !isPublicNote;
        apiPromises.push(callAddNoteAPI(config, ticketId, note, isPrivate));
      }

      await Promise.all(apiPromises);

      // --- 7. Success! ---
      setStatus("All actions complete!", false);
      chrome.tabs.reload(tab.id); // Reload page
      setTimeout(() => window.close(), 500);
    } catch (error) {
      await handleApiError(error);
      elements.submitBtn.disabled = false; // Allow retry on failure
    }
  });
});
