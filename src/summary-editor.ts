const summaryInput = document.getElementById("summaryInput") as HTMLTextAreaElement;
const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
const cancelButton = document.getElementById("cancelButton") as HTMLButtonElement;

// Populate the textarea with the current summary
window.electronAPI.loadSummary((summary) => {
  summaryInput.value = summary;
});

saveButton.addEventListener("click", () => {
  console.log("Save button clicked");
  const updatedSummary = summaryInput.value.trim();
  window.electronAPI.saveSummary(updatedSummary);
  window.close();
});

cancelButton.addEventListener("click", () => {
  console.log("Cancel button clicked");
  window.close();
});
