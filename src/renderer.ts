let currentSortColumn: string = ""; // Default to an empty string
let currentSortOrder: 'asc' | 'desc' = 'asc';



document.addEventListener("DOMContentLoaded", () => {
  const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;
  const tableBody = document.querySelector("#documentsTable tbody") as HTMLElement;
  const fileLabel = document.querySelector("label.custom-file-input") as HTMLLabelElement;

  if (!uploadButton || !tableBody) {
    console.error("Required elements not found in the DOM.");
    return;
  }

  window.electronAPI?.on("toggle-dark-mode", () => toggleDarkMode());

  function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");

    document.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("dark-mode");
    });

    document.querySelectorAll("th, td, tr").forEach((element) => {
      element.classList.toggle("dark-mode");
    });

    document.querySelectorAll(".responsive-input").forEach((input) => {
      input.classList.toggle("dark-mode");
    });

    if (fileLabel) {
      fileLabel.classList.toggle("dark-mode");
    }
  }


  // Fetch and display documents
  async function loadDocuments() {
    try {
      const response = await window.dbAPI.fetchDocuments();

      if (response.success) {
        console.log("Loaded documents:", response.documents);

        tableBody.innerHTML = ""; // Clear the table

        // Sort documents based on the current sort state
        if (currentSortColumn) {
          response.documents.sort((a: any, b: any) => {
            const valA = a.dataValues[currentSortColumn];
            const valB = b.dataValues[currentSortColumn];

            if (valA < valB) return currentSortOrder === "asc" ? -1 : 1;
            if (valA > valB) return currentSortOrder === "asc" ? 1 : -1;
            return 0;
          });
        }

        // Populate the table
        response.documents.forEach((doc: any, index: number) => {
          const dataValues = doc.dataValues;

          const row = document.createElement("tr");
          row.classList.add(index % 2 === 0 ? "even" : "odd");
          if (document.body.classList.contains("dark-mode")) {
            row.classList.add("dark-mode");
          }
          row.innerHTML = `
          <td>${dataValues.id || "undefined"}</td>
          <td>${dataValues.filename || "undefined"}</td>
          <td><input type="text" value="${dataValues.title || "undefined"}" data-id="${dataValues.id}" data-field="title" class="responsive-input ${document.body.classList.contains("dark-mode") ? "dark-mode" : ""}"></td>
          <td><input type="text" value="${dataValues.authors || "undefined"}" data-id="${dataValues.id}" data-field="authors" class="responsive-input ${document.body.classList.contains("dark-mode") ? "dark-mode" : ""}"></td>
          <td>${dataValues.metadata ? JSON.stringify(dataValues.metadata) : "No Metadata"}</td>
          <td>${dataValues.imageLinks
              ? dataValues.imageLinks.map((link: string) => `<a href="${link}" target="_blank">Image</a>`).join(", ")
              : "No Images"
            }</td>
          <td><button class="summarize-btn" data-id="${dataValues.id}">Summary Editing</button></td>
          <td>${dataValues.summary ? `<span class="summary-preview" data-id="${dataValues.id}">${dataValues.summary.substring(0, 50)}...</span>` : "No Summary Available"}</td>
          <td><input type="checkbox" ${dataValues.approved ? "checked" : ""} data-id="${dataValues.id}" data-field="approved"></td>
        `;
          tableBody.appendChild(row);
        });

        attachEventListeners(); // Attach event listeners to inputs and buttons
      } else {
        console.error("Failed to fetch documents:", response.error);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  }

  function makeTableSortable() {
    const table = document.getElementById("documentsTable") as HTMLTableElement;
    const headers = table.querySelectorAll("thead th");

    headers.forEach((header) => {
      header.addEventListener("click", () => {
        const sortKey = header.getAttribute("data-sort"); // Get the column to sort by
        if (!sortKey) return;

        // Update global sort state
        if (currentSortColumn === sortKey) {
          currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
        } else {
          currentSortColumn = sortKey;
          currentSortOrder = "asc";
        }

        // Refresh the table with the new sort order
        loadDocuments();

        // Update header styles
        headers.forEach((h) => h.classList.remove("asc", "desc"));
        header.classList.add(currentSortOrder);
      });
    });
  }




  // Attach event listeners to inputs and summarize buttons
  function attachEventListeners() {
    const inputs = tableBody.querySelectorAll("input[type='text'], input[type='checkbox']");
    const summarizeButtons = tableBody.querySelectorAll(".summarize-btn");

    // Inline editing
    inputs.forEach((input) => {
      input.addEventListener("change", async (event) => {
        const target = event.target as HTMLInputElement;
        const id = parseInt(target.dataset.id ?? "0", 10);
        const field = target.dataset.field ?? "";
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

    // Summarize buttons
    summarizeButtons.forEach((button) => {
      button.addEventListener("click", async (event) => {
        const paperId = parseInt(button.getAttribute("data-id") ?? "0", 10);
        console.log("Opening summarization modal for paper ID:", paperId);

        // Ask the main process to open the modal
        await window.modalAPI.openSummarizationModal(paperId);
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

  // Listen for table refresh trigger
  window.electronAPI.onRefreshTable(() => {
    console.log("Received refresh-table event"); // Debug log
    loadDocuments(); // Reload the table
  });

  // Initial Table Load
  loadDocuments();
  makeTableSortable();

});




document.body.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  if (target.classList.contains("summary-preview")) {
    const id = target.dataset.id;
    const summary = target.textContent?.trim() || "";

    // Request the main process to open the editor window
    window.electronAPI.openEditor({ id: parseInt(id!), summary });
  }
});