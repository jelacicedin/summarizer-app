import { ipcRenderer } from "electron";

// Safely get an element by ID
function getElementById<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element with ID "${id}" not found.`);
    }
    return element as T;
}

// Listen for the paper ID when the modal is opened
ipcRenderer.on("open-summarization-modal", async (event, paperId) => {
    console.log("Summarization modal opened for paper ID:", paperId);

    try {
        // Display the paper ID in the modal
        const paperIdElement = getElementById<HTMLParagraphElement>("paper-id");
        paperIdElement.textContent = `Paper ID: ${paperId}`;

        // Automatically fetch the existing summary or start summarization
        const summaryTextarea = getElementById<HTMLTextAreaElement>("summary");
        const existingSummary = await ipcRenderer.invoke("fetch-summary", paperId);

        if (existingSummary) {
            console.log("Existing summary found, displaying it in the modal.");
            summaryTextarea.value = existingSummary;
        } else {
            console.log("No existing summary found, extracting text and generating summary...");
            const filePath = await ipcRenderer.invoke("fetch-file-path", paperId); // Fetch file path for extraction
            if (!filePath) {
                throw new Error(`File path not found for paper ID ${paperId}.`);
            }

            const extractedText = await ipcRenderer.invoke("extract-text", filePath); // Extract text from the file
            if (!extractedText) {
                throw new Error(`Failed to extract text for paper ID ${paperId}.`);
            }

            const generatedSummary = await ipcRenderer.invoke("generate-summary", paperId, extractedText); // Generate summary from the extracted text
            summaryTextarea.value = generatedSummary || "Error generating summary.";
        }
    } catch (error: any) {
        console.error("Error initializing the summarization modal:", error.message);
    }
});

// Handle the "Send Correction" button click
document.addEventListener("DOMContentLoaded", () => {
    try {
        const sendCorrectionButton = getElementById<HTMLButtonElement>("send-correction");
        const chatboxInput = getElementById<HTMLTextAreaElement>("chatbox-input");
        const summaryTextarea = getElementById<HTMLTextAreaElement>("summary");
        const paperIdElement = getElementById<HTMLParagraphElement>("paper-id");

        sendCorrectionButton.addEventListener("click", async () => {
            try {
                // Get the correction text
                const correction = chatboxInput.value.trim();
                if (!correction) {
                    alert("Please enter a correction before sending.");
                    return;
                }

                // Get the paper ID from the displayed text
                const paperId = parseInt(paperIdElement.textContent?.replace("Paper ID: ", "") || "0", 10);
                if (!paperId) {
                    console.error("Invalid paper ID.");
                    alert("An error occurred. Please try again.");
                    return;
                }

                // Send the correction to the main process
                console.log(`Sending correction for paper ID ${paperId}: ${correction}`);
                const updatedSummary = await ipcRenderer.invoke("update-summary", paperId, correction);

                // Display the updated summary
                if (updatedSummary) {
                    summaryTextarea.value = updatedSummary;
                    chatboxInput.value = ""; // Clear the input box
                } else {
                    console.error("No updated summary received.");
                    alert("An error occurred while updating the summary.");
                }
            } catch (error: any) {
                console.error("Error sending correction:", error.message);
                alert("An error occurred. Please try again.");
            }
        });
    } catch (error: any) {
        console.error("Error setting up event listeners:", error.message);
    }
});
