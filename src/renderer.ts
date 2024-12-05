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
          let dataValues = doc.dataValues;
          row.innerHTML = `
            <td>${dataValues.id || "undefined"}</td>
            <td>${dataValues.filename || "undefined"}</td>
            <td><input type="text" value="${dataValues.title || "undefined"}" data-id="${dataValues.id}" data-field="title"></td>
            <td><input type="text" value="${dataValues.authors || "undefined"}" data-id="${dataValues.id}" data-field="authors"></td>
            <td><input type="text" value="${dataValues.summary || ""}" data-id="${dataValues.id}" data-field="summary"></td>
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

  // Initial Table Load
  loadDocuments();
});


function makeTableSortable(): void {
  const table = document.getElementById("documentsTable")!;
  const headers = table.querySelectorAll("thead th");

  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const sortKey = header.getAttribute("data-sort"); // Get the column to sort by
      const tbody = table.querySelector("tbody");
      const rows = Array.from(tbody?.querySelectorAll("tr") || []);

      if (!sortKey) return; // If no sort key, do nothing

      // Determine the current sorting direction
      const isAscending = header.classList.contains("asc");
      const direction = isAscending ? -1 : 1;

      // Sort rows based on the cell content for the clicked column
      rows.sort((rowA, rowB) => {
        const cellA = rowA.querySelector(`td:nth-child(${Array.from(headers).indexOf(header) + 1})`);
        const cellB = rowB.querySelector(`td:nth-child(${Array.from(headers).indexOf(header) + 1})`);

        // Handle cells with input fields
        const valueA = cellA?.querySelector("input") ? (cellA.querySelector("input") as HTMLInputElement).value.trim() : cellA?.textContent?.trim() || "";
        const valueB = cellB?.querySelector("input") ? (cellB.querySelector("input") as HTMLInputElement).value.trim() : cellB?.textContent?.trim() || "";

        // For numeric values, compare as numbers
        if (!isNaN(Number(valueA)) && !isNaN(Number(valueB))) {
          return (Number(valueA) - Number(valueB)) * direction;
        }

        // For strings, compare lexicographically
        return valueA.localeCompare(valueB) * direction;
      });

      // Remove current rows and append sorted rows
      rows.forEach((row) => tbody?.appendChild(row));

      // Update header classes for sorting direction
      headers.forEach((h) => h.classList.remove("asc", "desc"));
      header.classList.add(isAscending ? "desc" : "asc");
    });
  });
}
