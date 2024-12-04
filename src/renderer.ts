import { ipcMain } from "electron";
import { addDocument, getDocuments, updateDocument, deleteDocument } from "./database";


// Dark mode toggle
document.addEventListener("DOMContentLoaded", () => {
  const darkModeToggle = document.getElementById("darkModeToggle") as HTMLButtonElement;
  const fileLabel = document.querySelector("label.custom-file-input") as HTMLLabelElement;

  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    document.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("dark-mode");
    });

    if (fileLabel) {
      fileLabel.classList.toggle("dark-mode");
    }

    darkModeToggle.textContent = document.body.classList.contains("dark-mode")
      ? "Disable Dark Mode"
      : "Enable Dark Mode";
  });

  const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;

  uploadButton.addEventListener("click", async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Please select a file!");
      return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();

    try {
      const result = await (window as any).electronAPI.uploadPdf({ name: file.name, content: arrayBuffer });
      const summaryOutput = document.getElementById("summaryOutput") as HTMLPreElement;
      summaryOutput.textContent = `Summary:\n${result.summary}`;
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("An error occurred while processing the file.");
    }
  });
});

// Database ops
// Add a new document
ipcMain.handle("db:add-document", async (event, data) => {
  try {
    await addDocument(data);
    return { success: true };
  } catch (err: any) {
    console.error("Error adding document:", err);
    return { success: false, error: err.message };
  }
});

// Get all documents
ipcMain.handle("db:get-documents", async () => {
  try {
    const documents = await getDocuments();
    return { success: true, data: documents };
  } catch (err: any) {
    console.error("Error fetching documents:", err);
    return { success: false, error: err.message };
  }
});

// Update a document
ipcMain.handle("db:update-document", async (event, { id, updates }) => {
  try {
    await updateDocument(id, updates);
    return { success: true };
  } catch (err:any) {
    console.error("Error updating document:", err);
    return { success: false, error: err.message };
  }
});

// Delete a document
ipcMain.handle("db:delete-document", async (event, id) => {
  try {
    await deleteDocument(id);
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting document:", err);
    return { success: false, error: err.message };
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const uploadButton = document.getElementById("uploadButton");
  const tableBody = document.querySelector("#documentsTable tbody");

  // Fetch and display documents
  async function loadDocuments() {
    const response = await window.dbAPI.fetchDocuments();
    if (response.success) {
      tableBody.innerHTML = ""; // Clear the table
      response.documents.forEach((doc) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${doc.id}</td>
          <td>${doc.filename}</td>
          <td><input type="text" value="${doc.title}" data-id="${doc.id}" data-field="title"></td>
          <td><input type="text" value="${doc.authors}" data-id="${doc.id}" data-field="authors"></td>
          <td><input type="text" value="${doc.summary || ""}" data-id="${doc.id}" data-field="summary"></td>
          <td><input type="checkbox" ${doc.approved ? "checked" : ""} data-id="${doc.id}" data-field="approved"></td>
        `;
        tableBody.appendChild(row);
      });

      attachEventListeners();
    } else {
      console.error("Failed to fetch documents:", response.error);
    }
  }

  // Attach event listeners to input fields for inline editing
  function attachEventListeners() {
    const inputs = tableBody.querySelectorAll("input[type='text'], input[type='checkbox']");
    inputs.forEach((input) => {
      input.addEventListener("change", async (event) => {
        const { id, field } = event.target.dataset;
        const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;

        // Update the database
        const response = await window.dbAPI.updateDocument(parseInt(id), { [field]: value });
        if (!response.success) {
          console.error("Failed to update document:", response.error);
        }
      });
    });
  }

  // Upload a file
  uploadButton.addEventListener("click", async () => {
    const response = await window.dbAPI.uploadFile();
    if (response.success) {
      await loadDocuments(); // Refresh the table
    } else {
      console.error("File upload failed:", response.error || response.message);
    }
  });

  // Initial load
  loadDocuments();
});
