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
  
  // Handle the "Send Correction" button click
  async function handleSendCorrection() {
    try {
      const chatboxInput = getElementById<HTMLTextAreaElement>("chatbox-input");
      const summaryTextarea = getElementById<HTMLTextAreaElement>("summary");
      const paperIdElement = getElementById<HTMLParagraphElement>("paper-id");
  
      const correction = chatboxInput.value.trim();
      if (!correction) {
        alert("Please enter a correction before sending.");
        return;
      }
  
      const paperId = parseInt(paperIdElement.textContent?.replace("Paper ID: ", "") || "0", 10);
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
    } catch (error: any) {
      console.error("Error sending correction:", error.message);
    }
  }
  
  // Add event listeners
  document.addEventListener("DOMContentLoaded", () => {
    try {
      const sendCorrectionButton = getElementById<HTMLButtonElement>("send-correction");
      sendCorrectionButton.addEventListener("click", handleSendCorrection);
  
      // Listen for the "open-summarization-modal" event from the main process
      window.modalAPI.openSummarizationModal(1).then(() => {
        handleModalInitialization(1);
      });
  
      // Listen for modal initialization
      window.addEventListener("message", (event) => {
        const { paperId } = event.data;
        if (paperId) handleModalInitialization(paperId);
      });
    } catch (error: any) {
      console.error("Error setting up event listeners:", error.message);
    }
  });
  