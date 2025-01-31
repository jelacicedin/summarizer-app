// Safely get an element by ID
function getElementById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with ID "${id}" not found.`);
  }
  return element as T;
}

// Track initialized paper ID to prevent reinitialization
let initializedPaperId: number | null = null;

// Handle modal initialization
async function handleModalInitialization(paperId: number) {
  if (initializedPaperId === paperId) {
    console.log(`Modal for paper ID ${paperId} is already initialized.`);
    return; // Prevent multiple initializations for the same paper ID
  }

  console.log("Initializing modal for paper ID:", paperId);
  initializedPaperId = paperId;

  try {
    const paperIdElement = getElementById<HTMLParagraphElement>("paper-id");
    paperIdElement.textContent = `Paper ID: ${paperId}`;

    const summaryTextarea = getElementById<HTMLTextAreaElement>("summary");
    const existingSummary = await window.modalAPI.fetchSummary(paperId);

    if (existingSummary) {
      summaryTextarea.value = existingSummary;
    } else {
      const filePath = await window.modalAPI.fetchFilePath(paperId);
      const extractedText = await window.modalAPI.extractText(filePath);
      const generatedSummary = await window.modalAPI.generateSummary(paperId, extractedText);
      summaryTextarea.value = generatedSummary || "Error generating summary.";
    }
  } catch (error: any) {
    console.error("Error during modal initialization:", error.message);
  }
}

window.electronAPI?.on("toggle-dark-mode", () => toggleDarkMode());

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  document.querySelectorAll("th, td, tr").forEach((element) => {
    element.classList.toggle("dark-mode");
  });
  document.querySelectorAll(".responsive-input").forEach((input) => {
    input.classList.toggle("dark-mode");
  });

  document.querySelectorAll("h1, p, textarea, button").forEach((element) => {
    element.classList.toggle("dark-mode");
  });
}

// Listen for the "open-summarization-modal" event
window.modalAPI.onSummarizationModal((paperId: number) => {
  console.log("Received paperId in renderer:", paperId);
  handleModalInitialization(paperId);
});

// Handle the "Send Correction" button click
document.addEventListener("DOMContentLoaded", () => {
  console.log("Setting up event listeners for modal.");

  const saveSummaryButton = getElementById<HTMLButtonElement>("save-summary");
  saveSummaryButton.addEventListener("click", handleSaveSummary);


  const sendCorrectionButton = getElementById<HTMLButtonElement>("send-correction");
  sendCorrectionButton.addEventListener("click", async () => {
    const chatboxInput = getElementById<HTMLTextAreaElement>("chatbox-input");
    const summaryTextarea = getElementById<HTMLTextAreaElement>("summary");
    const paperIdElement = getElementById<HTMLParagraphElement>("paper-id");

    const correction = chatboxInput.value.trim();
    if (!correction) {
      alert("Please enter a correction before sending.");
      return;
    }

    const paperId = parseInt(paperIdElement.textContent?.replace("Paper ID: ", "") ?? "0", 10);
    if (!paperId) {
      console.error("Invalid paper ID.");
      alert("An error occurred. Please try again.");
      return;
    }

    const updatedSummary = await window.modalAPI.updateSummary(paperId, correction);
    if (updatedSummary) {
      summaryTextarea.value = updatedSummary;
      chatboxInput.value = ""; // Clear the input box
    } else {
      alert("An error occurred while updating the summary.");
    }
  });
});


// Save Summary Function
async function handleSaveSummary() {
  try {
    const summaryTextarea = getElementById<HTMLTextAreaElement>("summary");
    const paperIdElement = getElementById<HTMLParagraphElement>("paper-id");

    const updatedSummary = summaryTextarea.value.trim();
    const paperId = parseInt(paperIdElement.textContent?.replace("Paper ID: ", "") ?? "0", 10);

    if (!updatedSummary || !paperId) {
      alert("No valid summary or paper ID found.");
      return;
    }

    console.log(`Saving summary for paper ID ${paperId}:`, updatedSummary);

    // Save the updated summary to the database
    try {
      window.modalAPI.sendSummaryToDb(paperId, updatedSummary);
      alert("Summary saved successfully.");
      console.log("Notifying main window to refresh table.");
      window.modalAPI.refreshTable(); // Notify main window to refresh the table
    } catch (error: any) {
      alert("Error saving summary. Please try again.");
      throw error;
    }
  } catch (error: any) {
    console.error("Error saving summary:", error.message);
  }
}

