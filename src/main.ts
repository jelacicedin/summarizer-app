import { app, BrowserWindow, ipcMain, nativeTheme, dialog } from "electron";
import path from "path";
import { addDocument, getDocuments, updateDocument, fetchDocument } from "./database";
import { startDockerServices } from "./check-docker";
import { extractText } from "./pdf-handler";
import { summarizeText } from "./api";
import fs from "fs";

console.log("Main process is running. Directory:", __dirname);

// Global variables for windows
let mainWindow: BrowserWindow | null;
let splashWindow: BrowserWindow | null;

let editorWindow: BrowserWindow | null = null;

ipcMain.on("open-editor", (event, { id, summary }) => {
  // Create the editor window
  editorWindow = new BrowserWindow({
    width: 500,
    height: 400,
    modal: true,
    parent: mainWindow!,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
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


ipcMain.handle("summarize-text", async (event, text: string) => {
  try {
    const summary = await summarizeText(text);
    return { success: true, summary };
  } catch (error: any) {
    console.error("Error summarizing text:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fetch-document", async (event, id: number) => {
  try {
    const document = await fetchDocument(id);
    if (document) {
      return { success: true, document };
    } else {
      return { success: false, error: "Document not found" };
    }
  } catch (error: any) {
    console.error("Error fetching document: ", error);
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