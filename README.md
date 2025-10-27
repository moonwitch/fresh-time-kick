# Freshservice Time Kick (API)

A lightweight Edge extension to log time, update status, and add notes to Freshservice tickets via the API.

## Features

* **Multi-Action Panel:** Log time, update ticket status, and add a public note—all in one click.
* **Fast Access:** Use the toolbar popup or keyboard shortcut (`Ctrl+Shift+L` or `MacCtrl+Shift+L`) to open the action panel.
* **Smart UI:** "Log Time" is the default action. Changing the status dropdown automatically enables the "Update Status" action.
* **Direct API:** Logs time and updates directly via the Freshservice v2 API.
* **Configurable:** Set your API credentials and defaults for minutes, note, and billable status.
* **Secure:** Stores your API key in browser-synced storage.

## How to Install (for Colleagues)

This is a private extension.

1.  Go to the private Edge Add-on link provided to you.
2.  Click **Install**.
3.  After installing, click the extension icon (you may need to pin it first), go to **Options**.
4.  Fill in all fields in the **API Configuration** section and click **Save**.

## How to Use

1.  Navigate to any ticket on your Freshservice domain.
2.  Click the extension icon in your toolbar or press `Ctrl+Shift+L`.
3.  The **Log Time** fields are active by default. Adjust the **Minutes** and **Note** as needed.
4.  Check **"Add as public note"** to have the note added to the ticket's conversation (in addition to the time entry).
5.  Optionally, select a new status from the **"Update Status"** dropdown. This will automatically check the "Update Status" box.
6.  Click **Submit Actions**. The extension will perform all selected actions, and the page will reload to reflect the changes.

## Developer Setup

This project uses plain HTML, CSS, and JavaScript.

1.  Clone this repository.
2.  Open your browser and navigate to `edge://extensions` or `chrome://extensions`.
3.  Enable **Developer mode**.
4.  Click **Load unpacked** and select the `src` folder.

### Project Structure

* `manifest.json`: The extension's blueprint.
* `styles.css`: Shared stylesheet for both popup and options.
* `config.js`: Shared default settings object.
* `popup.html` / `popup.js`: The toolbar popup form and logic.
* `options.html` / `options.js`: The options page form and logic.
* `icons/`: Contains the extension icons.
