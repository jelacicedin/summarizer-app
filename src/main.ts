import { app, BrowserWindow, ipcMain, nativeTheme, dialog } from "electron";
import path from "path";
import { addDocument, getDocuments, updateDocument, fetchDocument } from "./database.js";
import { startDockerServices } from "./check-docker.js";
import { extractText } from "./pdf-handler.js";
import { summarizeTextForPaper, resetContextForPaper } from "./llm_api.js";
import fs from "fs";
import { fileURLToPath } from 'url';


// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global variables for windows
let mainWindow: BrowserWindow | null;
let splashWindow: BrowserWindow | null;
let editorWindow: BrowserWindow | null = null;
let chatModal: BrowserWindow | null = null;




ipcMain.on("open-editor", (event, { id, summary }) => {
  // Create the editor window
  editorWindow = new BrowserWindow({
    width: 500,
    height: 400,
    modal: true,
    parent: mainWindow!,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  editorWindow.loadFile(path.join(__dirname, "summary-editor.html"));

  // Send the current summary to the editor
  editorWindow.webContents.once("did-finish-load", () => {
    editorWindow?.webContents.send("load-summary", summary);
  });

  // Cleanup when the editor window is closed
  editorWindow.on("closed", () => {
    editorWindow = null;
  });
});



ipcMain.on("save-summary", async (event, updatedSummary) => {
  console.log("Received updated summary:", updatedSummary); // Debug log

  try {
    // Assume we track the current document ID in the editor's parent window
    const id = editorWindow?.getParentWindow()?.id;
    if (!id) throw new Error("No document ID found");

    await updateDocument(id, { summary: updatedSummary });

    // Notify the main window to refresh the table
    const mainWindow = BrowserWindow.getAllWindows().find((w) => w.id !== editorWindow?.id);
    if (mainWindow) {
      mainWindow.webContents.send("refresh-table");
    }

    event.reply("summary-saved", { success: true }); // Send success back to renderer

  } catch (error) {
    console.error("Error saving summary:", error);
    event.reply("summary-saved", { success: false, error });
  }

  editorWindow?.close(); // Close the editor window
});


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
    width: 1200,
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

  // Handle dark mode toggle
  ipcMain.handle("dark-mode:toggle", (): boolean => {
    const isDarkMode = nativeTheme.shouldUseDarkColors;
    nativeTheme.themeSource = isDarkMode ? "light" : "dark"; // Toggle between light & dark
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
    editorWindow = null;
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

    // Check for user cancellation or empty selection
    if (!result.canceled && result.filePaths.length > 0) {
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
ipcMain.handle("fetch-file-path", async (event, paperId:number) : Promise<string> =>  {
  try {
    const document = await fetchDocument(paperId);
    if (document)
    {
      return document.filePath;
    } else throw Error(`Could not fetch document with paperId ${paperId}`);
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    throw error;
  }
});

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
function createSummarizationModal(paperId: number) {
  if (chatModal) {
    console.log("Modal already open.");
    return; // Prevent creating multiple modals
  }

  chatModal = new BrowserWindow({
    width: 800,
    height: 600,
    modal: true,
    parent: BrowserWindow.getFocusedWindow() || undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  // Load the summarization HTML
  chatModal.loadFile(path.join(__dirname, "./summarization_modal/summarization.html"));

  // Send the paper ID to the renderer process when the modal is ready
  chatModal.once("ready-to-show", () => {
    console.log(`Sending paper ID ${paperId} to renderer`);
    chatModal?.webContents.send("open-summarization-modal", paperId);
  });

  // Handle modal close
  chatModal.on("closed", () => {
    console.log("Modal closed.");
    chatModal = null; // Reset the modal reference
  });
}

// Handle the IPC call to open the modal
ipcMain.handle("open-summarization-modal", (event, paperId: number) => {
  createSummarizationModal(paperId);
});

ipcMain.handle('summarize-text-for-paper', async (event, paperId: number, text: string, correction?: string) => {
  try {
    console.log(`Summarizing text for paper ID: ${paperId}`);
    const summary = await summarizeTextForPaper(paperId, text, correction);
    return { success: true, summary };
  } catch (error: any) {
    console.error(`Error summarizing text for paper ID: ${paperId}`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fetch-summary", async (event, paperId: number) => {
  console.log(`Fetching summary for paper ID ${paperId}`);
  const document = await fetchDocument(paperId); // Replace with your database fetch method
  return document?.dataValues.summary || null;
});

ipcMain.handle("generate-summary", async (event, paperId: number, extractedText: string) => {
  console.log(`Generating summary for paper ID ${paperId}`);
  try {
    const generatedSummary = await summarizeTextForPaper(paperId, extractedText); // Replace with your summarization logic
    await updateDocument(paperId, { summary: generatedSummary }); // Save the generated summary to the database
    return generatedSummary;
  } catch (error: any) {
    console.error("Error generating summary:", error.message);
    return "Error generating summary.";
  }
});

// Handle context reset requests
ipcMain.handle('reset-context-for-paper', async (event, paperId: number) => {
  try {
    console.log(`Resetting context for paper ID: ${paperId}`);
    resetContextForPaper(paperId);
    return { success: true };
  } catch (error: any) {
    console.error(`Error resetting context for paper ID: ${paperId}`, error);
    return { success: false, error: error.message };
  }
});



ipcMain.handle("update-summary", async (event, paperId: number, correction: string) => {
  console.log(`Received correction for paper ID ${paperId}:`, correction);

  // Call your summarization function with the correction
  const updatedSummary = await summarizeTextForPaper(paperId, "", correction);
  return updatedSummary;
});


ipcMain.handle("fetch-document", async (event, id) => {
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

ipcMain.handle("extract-text", async (event, filePath: string) => {
  try {
    const text = await extractText(filePath);
    if (text) {
      return { success: true, text };
    } else {
      return { success: false, error: "Did not parse any text." }
    }
  } catch (error: any) {
    console.error("Error extracting the text: ", error);
    return { success: false, error: error.message };
  }
});

