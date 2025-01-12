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

  let currentSortColumn: string | null = null;
let currentSortOrder: 'asc' | 'desc' = 'asc'; // Default to ascending



  // Fetch and display documents
  async function loadDocuments() {
    try {
      const response = await window.dbAPI.fetchDocuments();

      if (response.success) {
        console.log("Loaded documents:", response.documents);

        tableBody.innerHTML = ""; // Clear the table

        response.documents.forEach((doc: any) => {
          const dataValues = doc.dataValues;

          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${dataValues.id || "undefined"}</td>
            <td>${dataValues.filename || "undefined"}</td>
            <td><input type="text" value="${dataValues.title || "undefined"}" data-id="${dataValues.id}" data-field="title"></td>
            <td><input type="text" value="${dataValues.authors || "undefined"}" data-id="${dataValues.id}" data-field="authors"></td>
            <td>${dataValues.metadata ? JSON.stringify(dataValues.metadata) : "No Metadata"}</td>
            <td>${dataValues.imageLinks
              ? dataValues.imageLinks.map((link: string) => `<a href="${link}" target="_blank">Image</a>`).join(", ")
              : "No Images"
            }</td>
            <td><button class="summarize-btn" data-id="${dataValues.id}">Summarize</button></td>
            <td>${dataValues.summary ? `<span class="summary-preview" data-id="${dataValues.id}">${dataValues.summary.substring(0, 20)}...</span>` : "No Summary Available"}</td>
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

  // Attach event listeners to inputs and summarize buttons
  function attachEventListeners() {
    const inputs = tableBody.querySelectorAll("input[type='text'], input[type='checkbox']");
    const summarizeButtons = tableBody.querySelectorAll(".summarize-btn");

    // Inline editing
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

    // Summarize buttons
    summarizeButtons.forEach((button) => {
      button.addEventListener("click", async (event) => {
        const paperId = parseInt(button.getAttribute("data-id") || "0", 10);
        console.log("Opening summarization modal for paper ID:", paperId);

        // Ask the main process to open the modal
        await window.modalAPI.openSummarizationModal(paperId);
      });
    });
  }

  window.electronAPI.onRefreshTable(() => {
    console.log("Refreshing the documents table.");
    loadDocuments(); // Replace with your table loading logic
  });
  

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



function makeTableSortable() {
  const table = document.getElementById("documentsTable") as HTMLTableElement;
  const headers = table.querySelectorAll("thead th") as NodeListOf<HTMLTableCellElement>;

  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const sortKey = header.getAttribute("data-sort"); // Get the column to sort by
      const tbody = table.querySelector("tbody")!;
      const rows = Array.from(tbody.querySelectorAll("tr"));

      // Determine the current sorting direction
      const isCurrentlyAscending = header.classList.contains("asc");
      const direction = isCurrentlyAscending ? -1 : 1;

      // Remove "asc" and "desc" classes from all headers
      headers.forEach((h) => h.classList.remove("asc", "desc"));

      // Toggle the clicked header's sorting direction
      header.classList.add(isCurrentlyAscending ? "desc" : "asc");

      // Sort rows based on the data in the selected column
      rows.sort((rowA, rowB) => {
        const cellA = rowA.querySelector(`td:nth-child(${header.cellIndex + 1})`);
        const cellB = rowB.querySelector(`td:nth-child(${header.cellIndex + 1})`);

        let valueA = "";
        let valueB = "";

        if (cellA && cellB) {
          // Check if the cell contains an input element
          const inputA = cellA.querySelector("input") as HTMLInputElement | null;
          const inputB = cellB.querySelector("input") as HTMLInputElement | null;

          if (inputA && inputB) {
            valueA = inputA.value.trim();
            valueB = inputB.value.trim();
          } else {
            valueA = cellA.textContent?.trim() || "";
            valueB = cellB.textContent?.trim() || "";
          }
        }

        // Handle numeric and string sorting
        if (!isNaN(Number(valueA)) && !isNaN(Number(valueB))) {
          return (Number(valueA) - Number(valueB)) * direction; // Numeric sort
        }
        return valueA.localeCompare(valueB) * direction; // Lexicographic sort
      });

      // Append sorted rows back to the table
      rows.forEach((row) => tbody.appendChild(row));
    });
  });
}





document.body.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  if (target.classList.contains("summary-preview")) {
    const id = target.dataset.id;
    const summary = target.textContent?.trim() || "";

    // Request the main process to open the editor window
    window.electronAPI.openEditor({ id: parseInt(id!), summary });
  }
});