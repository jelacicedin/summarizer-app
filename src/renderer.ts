import { copyStage1ToStage2, Document } from "./database.js";

// Add to your CSS (create a new <style> tag or add to existing styles.css)
const modalCSS = `
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  z-index: 1000;
}

.modal-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 80%;
  max-width: 600px;
}

.modal-content.dark-mode {
  background-color: #333;
  color: white;
}

.modal-textarea {
  width: 100%;
  height: 300px;
  margin-bottom: 10px;
}
`;
document.head.appendChild(document.createElement("style")).textContent =
  modalCSS;

// Add modal HTML structure
const modalHTML = `
<div class="modal" id="summaryModal">
  <div class="modal-content">
    <textarea class="modal-textarea" id="modalTextarea"></textarea>
    <button id="modalSave">Save Changes</button>
    <button id="modalClose">Close</button>
  </div>
</div>
`;
document.body.insertAdjacentHTML("beforeend", modalHTML);

// Add these variables at the top of your file
let currentEditingTextarea: HTMLTextAreaElement | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

let currentSortColumn: string = ""; // Default to an empty string
let currentSortOrder: "asc" | "desc" = "asc";
let currentDocuments: Record<number, Document> = {};


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
      const newDocuments = response.documents;

      // Build an indexed map for comparison
      const newDocsMap: Record<number, Document> = {};
      newDocuments.forEach((doc: Document) => {
        newDocsMap[doc.dataValues.id] = doc;
      });

      // Replace entire table (simple approach)
      // If you want diffing, see below
      tableBody.innerHTML = "";
      currentDocuments = newDocsMap;
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
        response.documents.forEach((doc: Document, index: number) => {
          console.log("DOCUMENT:", doc);
          const dataValues = doc.dataValues;

          const row = document.createElement("tr");
          row.classList.add(index % 2 === 0 ? "even" : "odd");
          if (document.body.classList.contains("dark-mode")) {
            row.classList.add("dark-mode");
          }

          // ID cell
          const idCell = document.createElement("td");
          idCell.textContent = dataValues.id.toString() || "undefined";
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
          titleTextarea.dataset.id = dataValues.id.toString();
          titleTextarea.dataset.field = "title";
          titleCell.appendChild(titleTextarea);
          row.appendChild(titleCell);

          // Authors cell with textarea
          const authorsCell = document.createElement("td");
          const authorsTextarea = document.createElement("textarea");
          authorsTextarea.classList.add("expandable-textarea");
          authorsTextarea.value = dataValues.authors || "undefined";
          authorsTextarea.dataset.id = dataValues.id.toString();
          authorsTextarea.dataset.field = "authors";
          authorsCell.appendChild(authorsTextarea);
          row.appendChild(authorsCell);

          // Datetime Added cell
          const datetimeAddedCell = document.createElement("td");
          datetimeAddedCell.textContent =
            dataValues.datetimeAdded?.toString() || "undefined";
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
          stage1SummaryTextarea.classList.add(
            "expandable-textarea",
            "stage1-summary",
            "non-resizable"
          );
          stage1SummaryTextarea.value = dataValues.stage1Summary || "undefined";
          stage1SummaryTextarea.dataset.id = dataValues.id.toString();
          stage1SummaryTextarea.dataset.field = "stage1Summary";
          stage1SummaryCell.appendChild(stage1SummaryTextarea);
          row.appendChild(stage1SummaryCell);

          const stage1EditCell = document.createElement("td");
          const stage1EditButton = document.createElement("button");
          stage1EditButton.classList.add("summarize-btn","non-resizable");
          stage1EditButton.dataset.id = dataValues.id.toString();
          stage1EditButton.dataset.stage = "1";
          stage1EditButton.textContent = "AI Edit";
          if (document.body.classList.contains("dark-mode")) {
            stage1EditButton.classList.add("dark-mode");
          } else {
            stage1EditButton.classList.remove("dark-mode");
          }
          stage1EditCell.appendChild(stage1EditButton);
          row.appendChild(stage1EditCell);

          // Stage 1 Approval cell
          const stage1ApprovalCell = document.createElement("td");
          const stage1ApprovalCheckbox = document.createElement("input");
          stage1ApprovalCheckbox.type = "checkbox";
          stage1ApprovalCheckbox.classList.add("stage1-approval","non-resizable");
          stage1ApprovalCheckbox.checked = dataValues.approvalStage1 ?? false;
          stage1ApprovalCell.appendChild(stage1ApprovalCheckbox);
          row.appendChild(stage1ApprovalCell);

          // Stage 2 Summary cell
          const stage2SummaryCell = document.createElement("td");
          const stage2SummaryTextarea = document.createElement("textarea");
          stage2SummaryTextarea.classList.add(
            "expandable-textarea",
            "stage2-summary"
          );
          stage2SummaryTextarea.value = dataValues.stage2Summary || "undefined";
          stage2SummaryTextarea.dataset.id = dataValues.id.toString();
          stage2SummaryTextarea.dataset.field = "stage2Summary";
          stage2SummaryCell.appendChild(stage2SummaryTextarea);
          row.appendChild(stage2SummaryCell);

          // Stage 2 Approval cell
          const stage2ApprovalCell = document.createElement("td");
          const stage2ApprovalCheckbox = document.createElement("input");
          stage2ApprovalCheckbox.type = "checkbox";
          stage2ApprovalCheckbox.classList.add("stage2-approval");
          stage2ApprovalCheckbox.checked = dataValues.approvalStage2 ?? false;
          stage2ApprovalCell.appendChild(stage2ApprovalCheckbox);
          row.appendChild(stage2ApprovalCell);

          // Stage 3 Summary cell
          const stage3SummaryCell = document.createElement("td");
          const stage3SummaryTextarea = document.createElement("textarea");
          stage3SummaryTextarea.classList.add(
            "expandable-textarea",
            "stage3-summary"
          );
          stage3SummaryTextarea.value = dataValues.stage3Summary || "undefined";
          stage3SummaryTextarea.dataset.id = dataValues.id.toString();
          stage3SummaryTextarea.dataset.field = "stage3Summary";
          stage3SummaryCell.appendChild(stage3SummaryTextarea);
          row.appendChild(stage3SummaryCell);

          // Stage 3 Edit cell
          const stage3ApprovalCell = document.createElement("td");
          const stage3ApprovalCheckbox = document.createElement("input");
          stage3ApprovalCheckbox.type = "checkbox";
          stage3ApprovalCheckbox.classList.add("stage3-approval","non-resizable");
          stage3ApprovalCheckbox.checked = dataValues.approvalStage3 ?? false;
          stage3ApprovalCell.appendChild(stage3ApprovalCheckbox);
          row.appendChild(stage3ApprovalCell);

          // Export cell
          const exportCell = document.createElement("td");
          const exportButton = document.createElement("button");
          exportButton.classList.add("export-btn","non-resizable");
          exportButton.textContent = "Export";
          exportButton.disabled = dataValues.approvalStage3 ?? false;
          if (document.body.classList.contains("dark-mode")) {
            exportButton.classList.add("dark-mode");
          }
          exportButton.dataset.id = dataValues.id.toString();
          exportCell.appendChild(exportButton);
          row.appendChild(exportCell);

          // Add click handler to summary textareas
          const summaryTextareas = row.querySelectorAll(".expandable-textarea");
          summaryTextareas.forEach((textarea) => {
            textarea.addEventListener("click", (e) => {
              currentEditingTextarea = e.target as HTMLTextAreaElement;
              const modal = document.getElementById(
                "summaryModal"
              ) as HTMLDivElement;
              const modalTextarea = document.getElementById(
                "modalTextarea"
              ) as HTMLTextAreaElement;

              modalTextarea.value = currentEditingTextarea.value;
              modal.style.display = "block";
              if (document.body.classList.contains("dark-mode")) {
                modal
                  .querySelector(".modal-content")!
                  .classList.add("dark-mode");
              }
            });
          });

          // Add auto-save functionality to textareas
          const editableTextareas = [stage1SummaryTextarea,stage2SummaryTextarea,stage3SummaryTextarea];
          console.log(`EDITABLE TEXT AREAS that we can write to: ${editableTextareas}`);
          editableTextareas.forEach((textarea) => {
            textarea.addEventListener("input", (e) => {
              if (saveTimeout) clearTimeout(saveTimeout);
              saveTimeout = setTimeout(async () => {
                const target = e.target as HTMLTextAreaElement;
                const id = parseInt(target.dataset.id || "0", 10);
                const field = target.dataset.field || "";
                console.log(`NOW UPDATING ${id} paper field ${field} with ${target.value}`);
                try {
                  await window.dbAPI.updateDocument(id, {
                    [field]: target.value,
                  });
                } catch (error) {
                  console.error("Error saving document:", error);
                }
              }, 1000); // 1-second debounce
            });
          });

          tableBody.appendChild(row);

          makeTableHeadersResizable(document.querySelector('table')!);

          // Update the disabled state for this row
          updateDisabledState(row);

          // Attach event listeners to the checkboxes
          attachEventListeners(row);
        });
      } else {
        console.error("Failed to fetch documents:", response.error);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  }

  function updateDisabledState(row: HTMLTableRowElement): void {
    // Stage 1 elements
    const stage1ApprovalCheckbox = row.querySelector(
      ".stage1-approval"
    ) as HTMLInputElement | null;
    const stage1Summary = row.querySelector(
      ".stage1-summary"
    ) as HTMLTextAreaElement | null;
    const stage1EditButton = row.querySelector(
      ".summarize-btn"
    ) as HTMLButtonElement | null;

    // Stage 2 elements
    const stage2ApprovalCheckbox = row.querySelector(
      ".stage2-approval"
    ) as HTMLInputElement | null;
    const stage2Summary = row.querySelector(
      ".stage2-summary"
    ) as HTMLTextAreaElement | null;

    // Stage 3 elements
    const stage3ApprovalCheckbox = row.querySelector(
      ".stage3-approval"
    ) as HTMLInputElement;
    const exportButton = row.querySelector(".export-btn") as HTMLButtonElement;
    const stage3Summary = row.querySelector(
      ".stage3-summary"
    ) as HTMLTextAreaElement | null;
    if (
      !stage1ApprovalCheckbox ||
      !stage2ApprovalCheckbox ||
      !stage3ApprovalCheckbox
    ) {
      console.error("Checkboxes not found in row:", row);
      return;
    }

    if (!exportButton) {
      console.error("Export button not found in row.");
      return;
    }

    if (!stage1EditButton) {
      console.error("AI Edit button not found in row.");
      return;
    }

    if (!stage1Summary || !stage2Summary || !stage3Summary) {
      console.error("One or more summaries not found in row:", row);
      return;
    }

    const stage1Approval = stage1ApprovalCheckbox.checked;
    const stage2Approval = stage2ApprovalCheckbox.checked;
    const stage3Approval = stage3ApprovalCheckbox.checked;

    // Enable/disable Stage 1 elements based on Stage 1 approval
    stage1Summary.disabled = stage1Approval;
    stage1EditButton.disabled = stage1Approval;
    stage1ApprovalCheckbox.disabled = stage2Approval;
    // Enable/disable Stage 2 elements based on Stage 1 Approval
    stage2Summary.disabled = !stage1Approval || stage3Approval;
    stage2ApprovalCheckbox.disabled = !stage1Approval || stage3Approval;

    // Enable/disable Stage 3 elements based on Stage 2 Approval
    stage3Summary.disabled = !stage2Approval || !stage1Approval;
    stage3ApprovalCheckbox.disabled = !stage2Approval || !stage1Approval;
    exportButton.disabled = !stage3Approval;
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

  // Add this function to handle approval checkbox changes
  function handleApprovalChange(row: HTMLTableRowElement, stage: number) {
    return async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const id = parseInt(target.dataset.id || "0", 10);
      const field = `approvalStage${stage}`;
      const value = target.checked;

      try {
        // Update the database
        await window.dbAPI.updateDocument(id, { [field]: value });

        // Update dependent elements
        updateDisabledState(row);

        // If unapproving a stage, unapprove subsequent stages
        if (!value) {
          if (stage === 1) {
            await window.dbAPI.updateDocument(id, {
              approvalStage2: false,
              approvalStage3: false,
            });
          } else if (stage === 2) {
            await window.dbAPI.updateDocument(id, { approvalStage3: false });
          }
        }

        // Refresh the table if any stage is unapproved
        if (!value) loadDocuments();
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
        // Revert UI state if update failed
        target.checked = !value;
      }
    };
  }

  // Attach event listeners to inputs, summarize buttons, and export buttons
  function attachEventListeners(row: HTMLTableRowElement) {
    const stage1ApprovalCheckbox = row.querySelector(
      ".stage1-approval"
    ) as HTMLInputElement | null;
    const stage2ApprovalCheckbox = row.querySelector(
      ".stage2-approval"
    ) as HTMLInputElement | null;
    const stage3ApprovalCheckbox = row.querySelector(
      ".stage3-approval"
    ) as HTMLInputElement | null;

    if (
      !stage1ApprovalCheckbox ||
      !stage2ApprovalCheckbox ||
      !stage3ApprovalCheckbox
    ) {
      console.error("Checkboxes not found in row:", row);
      return;
    }

    const paperId: number = parseInt(row.children[0].textContent!);

    stage1ApprovalCheckbox.addEventListener("change", async () => {
      // Unlock Stage 2 if Stage 1 passed
      updateDisabledState(row);
      await window.dbAPI.updateDocument(paperId, {
        ["approvalStage1"]: stage1ApprovalCheckbox.checked,
      });
      if (stage1ApprovalCheckbox.checked) {
        // Store the Stage 1 Summary to Stage 2 Summary
        const stage1Summary = row.querySelector(
          ".stage1-summary"
        ) as HTMLTextAreaElement | null;
        const stage2Summary = row.querySelector(
          ".stage2-summary"
        ) as HTMLTextAreaElement | null;

        const success = await window.dbAPI.copyStage1ToStage2(paperId);

        console.log(
          `Stage 1 summary for paperId: ${paperId} is ${stage1Summary?.value} and the stage 2 summary ${stage2Summary?.value}`
        );
        if (success && stage1Summary && stage2Summary) {
          console.log(``);
          stage2Summary.value = stage1Summary.value;
        } else {
          console.error("Failed to copy Stage 1 Summary to Stage 2.");
        }
      }
    });

    stage2ApprovalCheckbox.addEventListener("change", async () => {
      updateDisabledState(row);
      await window.dbAPI.updateDocument(paperId, {
        ["approvalStage2"]: stage2ApprovalCheckbox.checked,
      });
      if (stage2ApprovalCheckbox.checked) {
        // Store the Stage 2 Summary to Stage 3 Summary
        const stage2Summary = row.querySelector(
          ".stage2-summary"
        ) as HTMLTextAreaElement | null;
        const stage3Summary = row.querySelector(
          ".stage3-summary"
        ) as HTMLTextAreaElement | null;

        const success = await window.dbAPI.copyStage2ToStage3(paperId);

        console.log(
          `Stage 2 summary for paperId: ${paperId} is ${stage2Summary?.value} and the stage 3 summary ${stage3Summary?.value}`
        );
        if (success && stage2Summary && stage3Summary) {
          console.log(``);
          stage3Summary.value = stage2Summary.value;
        } else {
          console.error("Failed to copy Stage 2 Summary to Stage 3.");
        }
      }
    });

    stage3ApprovalCheckbox.addEventListener("change", async () => {
      updateDisabledState(row);
      await window.dbAPI.updateDocument(paperId, {
        ["approvalStage3"]: stage3ApprovalCheckbox.checked,
      });

      // handleApprovalChange(row, 3);
    });

    // TODO: this needs to work separately for each button
    // Summarize button
    const summarizeButton = row.querySelector(
      ".summarize-btn"
    ) as HTMLButtonElement;
    summarizeButton.addEventListener("click", async () => {
      const paperId = parseInt(summarizeButton.dataset.id || "0", 10);

      // TODO: this needs to work for only the AI, need to REMOVE stage 2 edit
      const stage = parseInt(
        summarizeButton.getAttribute("data-stage") ?? "1",
        10
      );
      console.log(
        `Opening summarization modal for paper ID: ${paperId}, Stage: ${stage}`
      );

      // Ask the main process to open the modal
      await window.modalAPI.openSummarizationModal(paperId, stage);
    });

    // Add export button listener
    const exportButton = row.querySelector(".export-btn") as HTMLButtonElement;
    if (exportButton) {
      exportButton.addEventListener("click", async () => {
        const paperId = parseInt(exportButton.dataset.id || "0", 10);
        console.log(`Exporting document with ID: ${paperId}`);
        await window.exportAPI.exportDocument(paperId);
      });
    }
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

  // Reload the table every 10 secs
  setInterval(async () => {
    try {
      const response = await window.dbAPI.fetchDocuments();
      if (response.success) {
        const newDocuments = response.documents;
  
        let hasChanges = false;
  
        for (const newDoc of newDocuments) {
          const id = newDoc.dataValues.id;
          const oldDoc = currentDocuments[id];
  
          if (!oldDoc || JSON.stringify(oldDoc.dataValues) !== JSON.stringify(newDoc.dataValues)) {
            hasChanges = true;
            break;
          }
        }
  
        if (hasChanges) {
          console.debug("Changes detected in DB, reloading table...");
          await loadDocuments();
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 10000); // every 10 seconds


  document.getElementById('reloadButton')!.addEventListener('click', async () => {
    console.debug("Manual table reload triggered");
    await loadDocuments();
  });
  
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

// Add modal event listeners
document.getElementById("modalSave")!.addEventListener("click", async () => {
  if (currentEditingTextarea && currentEditingTextarea.value) {
    const modalTextarea = document.getElementById(
      "modalTextarea"
    ) as HTMLTextAreaElement;
    currentEditingTextarea.value = modalTextarea.value;

    // Trigger the input event to save changes
    currentEditingTextarea.dispatchEvent(new Event("input"));
  }
  document.getElementById("summaryModal")!.style.display = "none";
});

document.getElementById("modalClose")!.addEventListener("click", () => {
  document.getElementById("summaryModal")!.style.display = "none";
});


// Close modal when clicking outside
window.addEventListener("click", (event) => {
  const modal = document.getElementById("summaryModal")!;
  if (event.target === modal) {
    modal.style.display = "none";
  }
});

function makeTableHeadersResizable(table: HTMLTableElement) {
  const thElements = table.querySelectorAll('th');

  thElements.forEach((th) => {
    // Skip if marked as non-resizable
    if (th.classList.contains('non-resizable')) return;

    // Create a resize handle
    const resizer = document.createElement('div');
    resizer.style.width = '5px';
    resizer.style.height = '100%';
    resizer.style.position = 'absolute';
    resizer.style.top = '0';
    resizer.style.right = '0';
    resizer.style.cursor = 'col-resize';
    resizer.style.userSelect = 'none';
    resizer.style.zIndex = '10';

    // Make the parent th position relative
    th.style.position = 'relative';
    th.appendChild(resizer);

    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
      startX = e.pageX;
      startWidth = th.offsetWidth;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault(); // Prevent text selection
    });

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.pageX - startX);
      th.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  });
}