import { app, BrowserWindow, ipcMain, nativeTheme } from "electron";
import path from "path";
import { Document } from "./database";
import { extractText } from "./pdf-handler";
import { summarizeText } from "./api";
import fs from "fs";

// Global variables for windows
let mainWindow: BrowserWindow | null;
let splashWindow: BrowserWindow | null;

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
    width: 900,
    height: 700,
    show: false, // Hide until splash disappears
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
      nodeIntegration: true
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
  });
}

// Electron lifecycle hooks
app.whenReady().then(() => {
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

// IPC Handlers

interface FileData {
  name: string;
  content: ArrayBuffer;
}

// Register the IPC handler for pdf upload
// Handle file upload from renderer
ipcMain.handle("upload-pdf", async (event, fileData: FileData) => {
  try {
    console.log("Received file:", fileData.name);

    // Write the file to a temporary location
    const tempPath = path.join(app.getPath("temp"), fileData.name);
    fs.writeFileSync(tempPath, Buffer.from(fileData.content));

    // Process the file (extract text and summarize)
    const text = await extractText(tempPath);
    const summary = await summarizeText(text);

    console.log("Summary:", summary);

    // Return the summary to the renderer
    return { success: true, summary };
  } catch (error) {
    console.error("Error in 'upload-pdf' handler:", error);
    throw error;
  }
});