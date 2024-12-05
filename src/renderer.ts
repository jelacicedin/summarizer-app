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
        tableBody.innerHTML = ""; // Clear the table

        response.documents.forEach((doc) => {
          const row = document.createElement("tr");
          let dataValues = doc.dataValues;
          row.innerHTML = `
            <td>${dataValues.id || "undefined"}</td>
            <td>${dataValues.filename || "undefined"}</td>
            <td><input type="text" value="${dataValues.title || "undefined"}" data-id="${dataValues.id}" data-field="title"></td>
            <td><input type="text" value="${dataValues.authors || "undefined"}" data-id="${dataValues.id}" data-field="authors"></td>
            <td>
      <span class="summary-preview" data-id="${dataValues.id}">
        ${dataValues.summary ? dataValues.summary.slice(0, 30) + "..." : "No summary available"}
      </span>
    </td>
            <td><input type="checkbox" ${dataValues.approved ? "checked" : ""} data-id="${dataValues.id}" data-field="approved"></td>
          `;
          tableBody.appendChild(row);
        });

        attachEventListeners(); // Attach listeners to input fields for inline editing
        makeTableSortable(); // Enable sorting after rows are loaded

      } else {
        console.error("Failed to fetch documents:", response.error);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  }

  // Attach Event Listeners for Inline Editing
  function attachEventListeners(): void {
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

  // Listen for table refresh trigger
  window.electronAPI.onRefreshTable(() => {
    console.log("Received refresh-table event"); // Debug log
    loadDocuments(); // Reload the table
  });

  // Initial Table Load
  loadDocuments();
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