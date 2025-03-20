let currentSortColumn: string = ""; // Default to an empty string
let currentSortOrder: "asc" | "desc" = "asc";

document.addEventListener("DOMContentLoaded", () => {
  const uploadButton = document.getElementById(
    "uploadButton"
  ) as HTMLButtonElement;
  const tableBody = document.querySelector(
    "#documentsTable tbody"
  ) as HTMLElement;
  const fileLabel = document.querySelector(
    "label.custom-file-input"
  ) as HTMLLabelElement;

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
          response.documents.sort(
            (
              a: { dataValues: { [x: string]: any } },
              b: { dataValues: { [x: string]: any } }
            ) => {
              const valA = a.dataValues[currentSortColumn];
              const valB = b.dataValues[currentSortColumn];

              if (valA < valB) return currentSortOrder === "asc" ? -1 : 1;
              if (valA > valB) return currentSortOrder === "asc" ? 1 : -1;
              return 0;
            }
          );
        }

        // Populate the table
        response.documents.forEach(
          (doc: { dataValues: any }, index: number) => {
            const dataValues = doc.dataValues;

            const row = document.createElement("tr");
            row.classList.add(index % 2 === 0 ? "even" : "odd");
            if (document.body.classList.contains("dark-mode")) {
              row.classList.add("dark-mode");
            }

            // ID cell
            const idCell = document.createElement("td");
            idCell.textContent = dataValues.id || "undefined";
            row.appendChild(idCell);

            // Filename cell
            const filenameCell = document.createElement("td");
            filenameCell.textContent = dataValues.filename || "undefined";
            row.appendChild(filenameCell);

            // Title cell with textarea
            const titleCell = document.createElement("td");
            const titleTextarea = document.createElement("textarea");
            titleTextarea.classList.add("expandable-textarea");
            titleTextarea.value = dataValues.title || "undefined";
            titleTextarea.dataset.id = dataValues.id;
            titleTextarea.dataset.field = "title";
            titleCell.appendChild(titleTextarea);
            row.appendChild(titleCell);

            // Authors cell with textarea
            const authorsCell = document.createElement("td");
            const authorsTextarea = document.createElement("textarea");
            authorsTextarea.classList.add("expandable-textarea");
            authorsTextarea.value = dataValues.authors || "undefined";
            authorsTextarea.dataset.id = dataValues.id;
            authorsTextarea.dataset.field = "authors";
            authorsCell.appendChild(authorsTextarea);
            row.appendChild(authorsCell);

            // Datetime Added cell
            const datetimeAddedCell = document.createElement("td");
            datetimeAddedCell.textContent =
              dataValues.datetimeAdded || "undefined";
            row.appendChild(datetimeAddedCell);

            // Image Links cell
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

            // Stage 1 Summary and Approval
            const stage1SummaryCell = document.createElement("td");
            const stage1SummaryTextarea = document.createElement("textarea");
            stage1SummaryTextarea.classList.add("expandable-textarea");
            stage1SummaryTextarea.value =
              dataValues.stage1Summary || "undefined";
            stage1SummaryTextarea.dataset.id = dataValues.id;
            stage1SummaryTextarea.dataset.field = "stage1Summary";
            stage1SummaryCell.appendChild(stage1SummaryTextarea);
            row.appendChild(stage1SummaryCell);

            const stage1EditCell = document.createElement("td");
            const stage1EditButton = document.createElement("button");
            stage1EditButton.classList.add("summarize-btn");
            stage1EditButton.dataset.id = dataValues.id;
            stage1EditButton.dataset.stage = "1";
            stage1EditButton.textContent = "AI Edit";
            if (document.body.classList.contains("dark-mode")) {
              stage1EditButton.classList.add("dark-mode");
            } else {
              stage1EditButton.classList.remove("dark-mode");
            }
            stage1EditCell.appendChild(stage1EditButton);
            row.appendChild(stage1EditCell);

            const stage1ApprovalCell = document.createElement("td");
            const stage1ApprovalCheckbox = document.createElement("input");
            stage1ApprovalCheckbox.type = "checkbox";
            stage1ApprovalCheckbox.checked = dataValues.approvalStage1;
            stage1ApprovalCheckbox.dataset.id = dataValues.id;
            stage1ApprovalCheckbox.dataset.field = "approvalStage1";
            stage1ApprovalCell.appendChild(stage1ApprovalCheckbox);
            row.appendChild(stage1ApprovalCell);

            // Stage 2 Summary and Approval
            const stage2SummaryCell = document.createElement("td");
            const stage2SummaryTextarea = document.createElement("textarea");
            stage2SummaryTextarea.classList.add("expandable-textarea");
            stage2SummaryTextarea.value =
              dataValues.stage2Summary || "undefined";
            stage2SummaryTextarea.dataset.id = dataValues.id;
            stage2SummaryTextarea.dataset.field = "stage2Summary";
            stage2SummaryCell.appendChild(stage2SummaryTextarea);
            row.appendChild(stage2SummaryCell);

            const stage2EditCell = document.createElement("td");
            const stage2EditButton = document.createElement("button");
            stage2EditButton.classList.add("summarize-btn");
            stage2EditButton.dataset.id = dataValues.id;
            stage2EditButton.dataset.stage = "2";
            stage2EditButton.textContent = "Edit";
            // Explicitly set dark mode on the button
            if (document.body.classList.contains("dark-mode")) {
              stage2EditButton.classList.add("dark-mode");
            } else {
              stage2EditButton.classList.remove("dark-mode");
            }
            stage2EditCell.appendChild(stage2EditButton);
            row.appendChild(stage2EditCell);

            const stage2ApprovalCell = document.createElement("td");
            const stage2ApprovalCheckbox = document.createElement("input");
            stage2ApprovalCheckbox.type = "checkbox";
            stage2ApprovalCheckbox.checked = dataValues.approvalStage2;
            stage2ApprovalCheckbox.dataset.id = dataValues.id;
            stage2ApprovalCheckbox.dataset.field = "approvalStage2";
            stage2ApprovalCell.appendChild(stage2ApprovalCheckbox);
            row.appendChild(stage2ApprovalCell);

            // Stage 3 Summary and Approval
            const stage3SummaryCell = document.createElement("td");
            const stage3SummaryTextarea = document.createElement("textarea");
            stage3SummaryTextarea.classList.add("expandable-textarea");
            stage3SummaryTextarea.value =
              dataValues.stage3Summary || "undefined";
            stage3SummaryTextarea.dataset.id = dataValues.id;
            stage3SummaryTextarea.dataset.field = "stage3Summary";
            stage3SummaryCell.appendChild(stage3SummaryTextarea);
            row.appendChild(stage3SummaryCell);

            const stage3ApprovalCell = document.createElement("td");
            const stage3ApprovalCheckbox = document.createElement("input");
            stage3ApprovalCheckbox.type = "checkbox";
            stage3ApprovalCheckbox.checked = dataValues.approvalStage3;
            stage3ApprovalCheckbox.dataset.id = dataValues.id;
            stage3ApprovalCheckbox.dataset.field = "approvalStage3";
            stage3ApprovalCell.appendChild(stage3ApprovalCheckbox);
            row.appendChild(stage3ApprovalCell);

            const exportCell = document.createElement("td");
            const exportButton = document.createElement("button");
            exportButton.classList.add("export-btn");
            exportButton.dataset.id = dataValues.id;
            exportButton.textContent = "Export";
            // Explicitly set dark mode on the export button
            if (document.body.classList.contains("dark-mode")) {
              exportButton.classList.add("dark-mode");
            } else {
              exportButton.classList.remove("dark-mode");
            }
            exportCell.appendChild(exportButton);
            row.appendChild(exportCell);

            tableBody.appendChild(row);

          }
        );

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

  /// Function to update the disabled state of elements
  function updateDisabledState(row: HTMLTableRowElement): void {
    const stage1Approval = (
      row.querySelector(".stage1-approval") as HTMLInputElement
    ).checked;
    const stage2Approval = (
      row.querySelector(".stage2-approval") as HTMLInputElement
    ).checked;

    // Stage 2 elements
    const stage2Summary = row.querySelector(
      ".stage2-summary"
    ) as HTMLTextAreaElement;
    const stage2Edit = row.querySelector(".stage2-edit") as HTMLButtonElement;

    // Stage 3 elements
    const stage3Summary = row.querySelector(
      ".stage3-summary"
    ) as HTMLTextAreaElement;
    const stage3Edit = row.querySelector(".stage3-edit") as HTMLButtonElement;

    // Enable/disable Stage 2 elements based on Stage 1 Approval
    if (stage1Approval) {
      stage2Summary.classList.remove("disabled");
      stage2Edit.classList.remove("disabled");
    } else {
      stage2Summary.classList.add("disabled");
      stage2Edit.classList.add("disabled");
    }

    // Enable/disable Stage 3 elements based on Stage 2 Approval
    if (stage2Approval) {
      stage3Summary.classList.remove("disabled");
      stage3Edit.classList.remove("disabled");
    } else {
      stage3Summary.classList.add("disabled");
      stage3Edit.classList.add("disabled");
    }
  }

  // Add event listeners to all approval checkboxes
  document.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLElement; // Cast to HTMLElement
      const row = target.closest("tr") as HTMLTableRowElement; // Now closest is available
      updateDisabledState(row);
    });
  });

  // Attach event listeners to inputs, summarize buttons, and export buttons
  function attachEventListeners() {
    const inputs = tableBody.querySelectorAll(
      "input[type='text'], input[type='checkbox']"
    );
    const summarizeButtons = tableBody.querySelectorAll(".summarize-btn");
    const exportButtons = tableBody.querySelectorAll(".export-btn");

    // Inline editing
    inputs.forEach((input) => {
      input.addEventListener("change", async (event) => {
        const target = event.target as HTMLInputElement;
        const id = parseInt(target.dataset.id ?? "0", 10);
        const field = target.dataset.field ?? "";
        const value =
          target.type === "checkbox" ? target.checked : target.value;

        try {
          const response = await window.dbAPI.updateDocument(id, {
            [field]: value,
          });
          if (!response.success) {
            console.error("Failed to update document:", response.error);
          } else {
            // Handle stage transitions
            if (field.startsWith("approvalStage") && value) {
              const stage = parseInt(field.replace("approvalStage", ""), 10);
              if (stage === 1) {
                await window.dbAPI.updateDocument(id, {
                  stage2Summary: (
                    target
                      .closest("tr")
                      ?.querySelector(
                        "input[data-field='stage1Summary']"
                      ) as HTMLInputElement
                  )?.value,
                  approvalStage2: false,
                });
              } else if (stage === 2) {
                await window.dbAPI.updateDocument(id, {
                  stage3Summary: (
                    target
                      .closest("tr")
                      ?.querySelector(
                        "input[data-field='stage2Summary']"
                      ) as HTMLInputElement
                  )?.value,
                  approvalStage3: false,
                });
              }
              loadDocuments(); // Refresh the table to reflect changes
            } else if (field === "approvalStage3" && !value) {
              await window.dbAPI.updateDocument(id, { approvalStage2: false });
              loadDocuments(); // Refresh the table to reflect changes
            }
          }
        } catch (error) {
          console.error("Error updating document:", error);
        }
      });
    });

    // Summarize buttons
    summarizeButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const paperId = parseInt(button.getAttribute("data-id") ?? "0", 10);
        const stage = parseInt(button.getAttribute("data-stage") ?? "1", 10);
        console.log(
          `Opening summarization modal for paper ID: ${paperId}, Stage: ${stage}`
        );

        // Ask the main process to open the modal
        await window.modalAPI.openSummarizationModal(paperId, stage);
      });
    });

    // Export buttons
    exportButtons.forEach((button) => {
      button.addEventListener("click", async (event) => {
        const paperId = parseInt(button.getAttribute("data-id") ?? "0", 10);
        console.log(`Exporting document with ID: ${paperId}`);

        // Ask the main process to handle the export
        await window.exportAPI.exportDocument(paperId);
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
    const summary = target.textContent?.trim() ?? "";

    // Request the main process to open the editor window
    window.electronAPI.openEditor({ id: parseInt(id!), summary });
  }
});
