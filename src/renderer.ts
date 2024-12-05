document.addEventListener("DOMContentLoaded", () => {
  const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;
  const tableBody = document.querySelector("#documentsTable tbody") as HTMLElement;
  const darkModeToggle = document.getElementById("darkModeToggle") as HTMLButtonElement;
  const fileLabel = document.querySelector("label.custom-file-input") as HTMLLabelElement;

  if (!uploadButton || !tableBody || !darkModeToggle) {
    console.error("Required elements not found in the DOM.");
    return;
  }

  // Dark Mode Toggle
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

  // Fetch and Display Documents
  async function loadDocuments() {
    try {
      const response = await window.dbAPI.fetchDocuments(); // Fetch documents via IPC
      const tableBody = document.querySelector("#documentsTable tbody");
  
      if (!tableBody) throw new Error("Table body element not found");
  
      if (response.success) {
        console.log("Loaded documents:", response.documents); // Log fetched data
        tableBody.innerHTML = ""; // Clear the table
  
        response.documents.forEach((doc) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${doc.id || "undefined"}</td>
            <td>${doc.filename || "undefined"}</td>
            <td><input type="text" value="${doc.title || "undefined"}" data-id="${doc.id}" data-field="title"></td>
            <td><input type="text" value="${doc.authors || "undefined"}" data-id="${doc.id}" data-field="authors"></td>
            <td><input type="text" value="${doc.summary || ""}" data-id="${doc.id}" data-field="summary"></td>
            <td><input type="checkbox" ${doc.approved ? "checked" : ""} data-id="${doc.id}" data-field="approved"></td>
          `;
          tableBody.appendChild(row);
        });
  
        attachEventListeners(); // Attach listeners to input fields for inline editing
      } else {
        console.error("Failed to fetch documents:", response.error);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  }

  // Attach Event Listeners for Inline Editing
  function attachEventListeners() {
    const inputs = tableBody.querySelectorAll("input[type='text'], input[type='checkbox']");
    inputs.forEach((input) => {
      input.addEventListener("change", async (event) => {
        const target = event.target as HTMLInputElement;
        const id = parseInt(target.dataset.id || "0", 10);
        const field = target.dataset.field || "";

        const value = target.type === "checkbox" ? target.checked : target.value;

        try {
          const response = await window.dbAPI.updateDocument(id, { [field]: value });
          if (!response.success) {
            console.error("Failed to update document:", response.error);
          }
        } catch (error) {
          console.error("Error updating document:", error);
        }
      });
    });
  }

  // Upload File and Refresh Table
  uploadButton.addEventListener("click", async () => {
    try {
      const response = await window.dbAPI.uploadFile();
      if (response.success) {
        await loadDocuments(); // Refresh the table
      } else {
        console.error("File upload failed:", response.message);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  });

  // Initial Table Load
  loadDocuments();
});