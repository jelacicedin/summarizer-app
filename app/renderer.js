// Wait for the DOM to load before adding event listeners
document.addEventListener("DOMContentLoaded", () => {
    // Select elements from the DOM
    const uploadButton = document.getElementById("uploadButton");
  
    // Add a click event listener to the "Upload and Summarize" button
    uploadButton.addEventListener("click", async () => {
        const fileInput = document.getElementById("fileInput");
        const file = fileInput.files[0]; // Get the first selected file
      
        if (!file) {
          alert("Please select a file!");
          return;
        }
      
        try {
          // Read the file content as a binary buffer
          const reader = new FileReader();
          reader.onload = async function () {
            const fileContent = reader.result; // Binary file content
            const fileName = file.name;
      
            // Send the file content and name to the main process
            const result = await window.electronAPI.uploadPdf({
              name: fileName,
              content: fileContent,
            });
      
            console.log("Summary from main process:", result.summary);
      
            // Display the summary in the UI
            const summaryOutput = document.getElementById("summaryOutput");
            summaryOutput.textContent = `Summary:\n${result.summary}`;
          };
      
          // Read the file as an ArrayBuffer
          reader.readAsArrayBuffer(file);
        } catch (error) {
          console.error("Error uploading PDF:", error);
          alert("An error occurred while processing the PDF. Check the console for details.");
        }
      });
  });