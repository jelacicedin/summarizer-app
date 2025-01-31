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

          const idCell = document.createElement("td");
          idCell.textContent = dataValues.id || "undefined";
          row.appendChild(idCell);

          const filenameCell = document.createElement("td");
          filenameCell.textContent = dataValues.filename || "undefined";
          row.appendChild(filenameCell);

          const titleCell = document.createElement("td");
          const titleInput = document.createElement("input");
          titleInput.type = "text";
          titleInput.value = dataValues.title || "undefined";
          titleInput.dataset.id = dataValues.id;
          titleInput.dataset.field = "title";
          titleInput.classList.add("responsive-input");
          if (document.body.classList.contains("dark-mode")) {
            titleInput.classList.add("dark-mode");
          }
          titleCell.appendChild(titleInput);
          row.appendChild(titleCell);

          const authorsCell = document.createElement("td");
          const authorsInput = document.createElement("input");
          authorsInput.type = "text";
          authorsInput.value = dataValues.authors || "undefined";
          authorsInput.dataset.id = dataValues.id;
          authorsInput.dataset.field = "authors";
          authorsInput.classList.add("responsive-input");
          if (document.body.classList.contains("dark-mode")) {
            authorsInput.classList.add("dark-mode");
          }
          authorsCell.appendChild(authorsInput);
          row.appendChild(authorsCell);

          const metadataCell = document.createElement("td");
          metadataCell.textContent = dataValues.metadata ? JSON.stringify(dataValues.metadata) : "No Metadata";
          row.appendChild(metadataCell);

          const imageLinksCell = document.createElement("td");
          if (dataValues.imageLinks) {
            dataValues.imageLinks.forEach((link: string) => {
              const anchor = document.createElement("a");
              anchor.href = link;
              anchor.target = "_blank";
              anchor.textContent = "Image";
              imageLinksCell.appendChild(anchor);
              imageLinksCell.appendChild(document.createTextNode(", "));
            });
            // Remove the last comma and space
            if (imageLinksCell.lastChild) {
              imageLinksCell.removeChild(imageLinksCell.lastChild);
            }
          } else {
            imageLinksCell.textContent = "No Images";
          }
          row.appendChild(imageLinksCell);

          const actionsCell = document.createElement("td");
          const summarizeButton = document.createElement("button");
          summarizeButton.classList.add("summarize-btn");
          summarizeButton.dataset.id = dataValues.id;
          summarizeButton.textContent = "Summary Editing";
          actionsCell.appendChild(summarizeButton);
          row.appendChild(actionsCell);

          const summaryCell = document.createElement("td");
          if (dataValues.summary) {
            const summarySpan = document.createElement("span");
            summarySpan.classList.add("summary-preview");
            summarySpan.dataset.id = dataValues.id;
            summarySpan.textContent = `${dataValues.summary.substring(0, 50)}...`;
            summaryCell.appendChild(summarySpan);
          } else {
            summaryCell.textContent = "No Summary Available";
          }
          row.appendChild(summaryCell);

          const approvedCell = document.createElement("td");
          const approvedCheckbox = document.createElement("input");
          approvedCheckbox.type = "checkbox";
          approvedCheckbox.checked = dataValues.approved;
          approvedCheckbox.dataset.id = dataValues.id;
          approvedCheckbox.dataset.field = "approved";
          approvedCell.appendChild(approvedCheckbox);
          row.appendChild(approvedCell);

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