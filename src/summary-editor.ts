import { ipcRenderer } from "electron";

// Elements
const summaryInput = document.getElementById("summaryInput") as HTMLTextAreaElement;
const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
const cancelButton = document.getElementById("cancelButton") as HTMLButtonElement;

// Populate the textarea with the current summary
ipcRenderer.on("load-summary", (event, summary) => {
    summaryInput.value = summary;
});


saveButton.addEventListener("click", () => {
    console.log("Save button clicked"); // Debug log
    const updatedSummary = (document.getElementById("summaryInput") as HTMLTextAreaElement).value.trim();
    console.log("Updated Summary:", updatedSummary); // Debug log
    ipcRenderer.send("save-summary", updatedSummary); // Send the updated summary to the main process
    window.close(); // Close the editor window
});

cancelButton.addEventListener("click", () => {
    console.log("Cancel button clicked"); // Debug log
    window.close(); // Close the editor window
});