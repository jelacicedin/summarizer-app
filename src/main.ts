import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  dialog,
  Menu,
} from "electron";
import path from "path";
import {
  addDocument,
  getDocuments,
  updateDocument,
  fetchDocument,
  getPdfFolderPath,
  getStage3Summary,
  copyStage1ToStage2,
  copyStage2ToStage3,
  getConversationById,
  saveConversation,
} from "./database.js";
import { startDockerServices } from "./check-docker.js";
import { extractText } from "./pdf-handler.js";
// import { summarizeTextForPaper, resetContextForPaper } from "./llm_api.js";
import fs, { PathOrFileDescriptor } from "fs";
import { fileURLToPath } from "url";
import { exportStage3Summary } from "./utils/exportSummary.js";
import { summarizeDocument } from "./llm_api.js";
import { Message } from "./interface.js";

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global variables for windows
let mainWindow: BrowserWindow | null;
let splashWindow: BrowserWindow | null;
let chatModal: BrowserWindow | null = null;

function createSplashScreen(): void {
  splashWindow = new BrowserWindow({
    width: 800,
    height: 509,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
  });

  splashWindow.loadFile(path.join(__dirname, "assets/splash/splash.html"));

  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    show: false, // Hide until splash disappears
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: false,
    },
    resizable: false,
    backgroundColor: "#ffffffff", // Solid background to prevent transparency issues
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Fire up the menu
  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [{ role: "quit" }],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Dark Mode",
          click: () => {
            mainWindow?.webContents.send("toggle-dark-mode");
            chatModal?.webContents.send("toggle-dark-mode");

            if (nativeTheme.shouldUseDarkColors) {
              nativeTheme.themeSource = "light";
            } else {
              nativeTheme.themeSource = "dark";
            }
            return nativeTheme.shouldUseDarkColors;
          },
        },
        { role: "reload" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            mainWindow?.webContents.send("about-dialog");
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);

  ipcMain.handle("toggle-dark-mode-theme", () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = "light";
    } else {
      nativeTheme.themeSource = "dark";
    }
    return nativeTheme.shouldUseDarkColors;
  });

  // Handle startup sequence
  mainWindow.once("ready-to-show", () => {
    fs.readFile(
      path.join(__dirname, "../src/config/config.json"), // Correct relative path
      "utf-8",
      (err, data) => {
        if (err) {
          console.error("Error reading config.json:", err);
          return;
        }
        const config = JSON.parse(data);
        const animationDuration = config.splashScreen.animationDurationMillis;

        setTimeout(() => {
          if (splashWindow) splashWindow.close(); // Close splash screen first
          mainWindow?.show(); // Then show the main window
          mainWindow?.webContents.invalidate(); // Force redraw of screen for the main app
        }, animationDuration - 100); // Use the value from config.json
      }
    );
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    splashWindow = null;
  });
}

// Electron lifecycle hooks
app.whenReady().then(() => {
  startDockerServices();
  createSplashScreen();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });

  app.on("window-all-closed", () => {
    // Close the app if all windows are closed (except on macOS)
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
});

// Register the IPC handler for pdf upload
// Handle adding a document (triggered by file upload)
ipcMain.handle("upload-file", async () => {
  try {
    const result: any = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "PDFs", extensions: ["pdf"] }],
    });
    console.log(result);
    // Check for user cancellation or empty selection
    if (result && !result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const filename = path.basename(filePath);

      // Add document data to database
      const newDoc = {
        filename,
        filePath,
        title: filename.replace(".pdf", ""),
        authors: "Unknown",
        metadata: { uploaded: new Date() },
      };

      await addDocument(newDoc);

      return { success: true, document: newDoc };
    }

    return { success: false, message: "No file selected" };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return { success: false, error: error.message };
  }
});

// Handle fetching all documents
ipcMain.handle("fetch-documents", async () => {
  try {
    const documents = await getDocuments(); // Fetch from the database
    return { success: true, documents }; // Return documents to the renderer
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    return { success: false, error: error.message };
  }
});

// Handle returning a filepath for a document
ipcMain.handle(
  "fetch-file-path",
  async (event, paperId: number): Promise<string> => {
    try {
      const document = await fetchDocument(paperId);
      if (document) {
        return document.filePath;
      } else throw Error(`Could not fetch document with paperId ${paperId}`);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      throw error;
    }
  }
);

// Handle updating a document
ipcMain.handle("update-document", async (event, { id, updates }) => {
  try {
    await updateDocument(id, updates);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating document:", error);
    return { success: false, error: error.message };
  }
});

// Function to create the summarization modal
function createSummarizationModal(paperId: number, stage: number) {
  // TODO: implement this stage option for two different modal types.
  if (chatModal) {
    console.log("Modal already open.");
    return; // Prevent creating multiple modals
  }

  chatModal = new BrowserWindow({
    width: 1400,
    height: 800,
    modal: true,
    parent: BrowserWindow.getFocusedWindow() || undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  // Load the summarization HTML
  chatModal.loadFile(
    path.join(__dirname, "./summarization_modal/summarization.html")
  );

  // Send the paper ID to the renderer process when the modal is ready
  chatModal.once("ready-to-show", () => {
    console.log(`Sending paper ID ${paperId} to renderer`);
    chatModal?.webContents.send("open-summarization-modal", paperId);
    if (nativeTheme.themeSource === "dark") {
      chatModal?.webContents.send("toggle-dark-mode");
    }
  });

  // Handle modal close
  chatModal.on("closed", () => {
    console.log("Modal closed.");
    chatModal = null; // Reset the modal reference
  });
}

// Handle the IPC call to open the modal
ipcMain.handle(
  "open-summarization-modal",
  (event, paperId: number, stage: number) => {
    createSummarizationModal(paperId, stage);
  }
);

// ipcMain.handle(
//   "summarize-text-for-paper",
//   async (event, paperId: number, text: string, correction?: string) => {
//     try {
//       console.log(`Summarizing text for paper ID: ${paperId}`);
//       const summary = await summarizeTextForPaper(paperId, text, correction);
//       return { success: true, summary };
//     } catch (error: any) {
//       console.error(`Error summarizing text for paper ID: ${paperId}`, error);
//       return { success: false, error: error.message };
//     }
//   }
// );

ipcMain.on("refresh-table", () => {
  console.log("Received request to refresh the table.");
  mainWindow?.webContents.send("refresh-table"); // Notify the main window to refresh the table
});

ipcMain.handle("fetch-summary", async (event, paperId: number) => {
  console.log(`Fetching summary for paper ID ${paperId}`);
  const document = await fetchDocument(paperId); // Replace with your database fetch method
  return document?.dataValues.stage1Summary ?? null;
});

// ipcMain.handle(
//   "generate-summary",
//   async (event, paperId: number, extractedText: string) => {
//     console.log(`Generating summary for paper ID ${paperId}`);
//     try {
//       const generatedSummary = await summarizeTextForPaper(
//         paperId,
//         extractedText
//       ); // Replace with your summarization logic
//       // await updateDocument(paperId, { summary: generatedSummary }); // Save the generated summary to the database
//       return generatedSummary;
//     } catch (error: any) {
//       console.error("Error generating summary:", error.message);
//       return "Error generating summary.";
//     }
//   }
// );

// Handle context reset requests
// ipcMain.handle("reset-context-for-paper", async (event, paperId: number) => {
//   try {
//     console.log(`Resetting context for paper ID: ${paperId}`);
//     resetContextForPaper(paperId);
//     return { success: true };
//   } catch (error: any) {
//     console.error(`Error resetting context for paper ID: ${paperId}`, error);
//     return { success: false, error: error.message };
//   }
// });

ipcMain.handle(
  "send-summary-to-db",
  async (_, paperId: number, text: string) => {
    console.log(`Received new database summary for paper ID ${paperId}`);

    try {
      await updateDocument(paperId, { stage1Summary: text });
    } catch (error: any) {
      console.error(`Could not update document ${paperId} with text ${text}`);
      throw error;
    }
  }
);

// ipcMain.handle(
//   "update-summary",
//   async (_, paperId: number, correction: string) => {
//     console.log(`Received correction for paper ID ${paperId}:`, correction);

//     // Call your summarization function with the correction
//     const updatedSummary = await summarizeTextForPaper(paperId, "", correction);
//     return updatedSummary;
//   }
// );

ipcMain.handle("fetch-document", async (_, id) => {
  console.log("ID received in fetch-document handler:", id); // Add this log
  if (!id) {
    console.error("Invalid ID received:", id);
    return { success: false, error: "Invalid ID" };
  }

  try {
    const document = await fetchDocument(id);
    return { success: true, document };
  } catch (error: any) {
    console.error("Error fetching document:", error);
    return { success: false, error: error.message };
  }
});

// Handle text extraction
ipcMain.handle("extract-text", async (_, filePath: string) => {
  try {
    const text = await extractText(filePath);
    if (text) {
      return text;
    } else {
      throw Error("Did not parse any text.");
    }
  } catch (error: any) {
    console.error("Error extracting the text: ", error);
  }
});

// Handle document export
ipcMain.handle("export-document", async (_, paperId: number) => {
  try {
    const summary = await getStage3Summary(paperId);
    const folderPath = await getPdfFolderPath(paperId);
    if (!summary) {
      throw new Error(`Missing summary for paper with ID ${paperId}.`);
    }
    if (!folderPath) {
      throw new Error(`Missing folder path for paper with ID ${paperId}.`);
    }

    const exportPath = path.join(
      folderPath,
      `document_${paperId}_stage3_summary.md`
    );
    fs.writeFileSync(exportPath, `# Stage 3 Summary\n\n${summary}`, "utf8");

    return { success: true, path: exportPath };
  } catch (error: any) {
    console.error("Failed to export Stage 3 summary:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("copy-stage1-to-stage2", async (_, id: number) => {
  return await copyStage1ToStage2(id);
});

ipcMain.handle("copy-stage2-to-stage3", async (_, id: number) => {
  return await copyStage2ToStage3(id);
});

ipcMain.handle("get-conversation", async (_, id) => {
  return await getConversationById(id);
});

ipcMain.handle("save-conversation", async (_, id, conversation) => {
  await saveConversation(id, conversation);
});

ipcMain.handle("summarize-document", async (_, id, messages) => {
  // Get the filepath of the PDF
  const pdfFilePath = (await fetchDocument(id))
    ?.filePath as PathOrFileDescriptor;
  // 1. Get the extracted text from the PDF (by id)
  const pdfText = await extractText(pdfFilePath);
  const cleanText = cleanPdfText(pdfText);
  const truncatedText = cleanText.slice(0,8000);
  // 2. Prepend it to the conversation history as a system/user message
  const combinedMessages: Message[] = [
    {
      role: "system",
      content: "The following is the content of the scientific paper:",
    },
    { role: "user", content: truncatedText },
    ...messages,
  ];
  return await summarizeDocument(id, combinedMessages);
});

function cleanPdfText(text: string): string {
  return text
    .replace(/\n/g, " ") // flatten line breaks
    .replace(/\s{2,}/g, " ") // collapse whitespace
    .replace(/Page \d+ of \d+/g, "") // remove page indicators
    .replace(/\[[^\]]*?\]/g, "") // remove inline references like [1], [2]
    .replace(/(References|Bibliography)[\s\S]+/i, "") // remove bibliography
    .trim();
}