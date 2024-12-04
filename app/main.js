const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const { Document } = require("./database");
const { extractText } = require("./pdf-handler");
const { summarizeText } = require("./api");
const fs = require("fs");

// Global variables for windows
let mainWindow;
let splashWindow;

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 800,
    height: 509,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
  });

  splashWindow.loadFile("app/assets/splash/splash.html");

  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
      nodeIntegration: true
    },
    resizable: false,
    backgroundColor: "#ffffffff", // Solid background to prevent transparency issues
  });

  mainWindow.loadFile("app/index.html");

  // Handle dark mode toggle
  ipcMain.handle("dark-mode:toggle", () => {
    const isDarkMode = nativeTheme.shouldUseDarkColors;
    nativeTheme.themeSource = isDarkMode ? "light" : "dark"; // Toggle between light & dark
    return nativeTheme.shouldUseDarkColors;
  });

  // Handle startup sequence
  mainWindow.once("ready-to-show", () => {
    fs.readFile(
      path.join(__dirname, "./config/config.json"),
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
          mainWindow.show(); // Then show the main window
          mainWindow.webContents.invalidate(); // Force redraw of screen for the main app
        }, animationDuration - 100); // Use the value from config.json
      }
    );
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

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

// Handle execution of commands in the main process
ipcMain.handle("execute-command", (event, command) => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`Error: ${err.message}`)); // Ensure error is handled correctly
        return;
      }
      if (stderr) {
        reject(new Error(`stderr: ${stderr}`)); // Handle stderr properly
        return;
      }
      resolve(stdout);
    });
  });
});

// Register the IPC handler for pdf upload
// Handle file upload from renderer
ipcMain.handle("upload-pdf", async (event, fileData) => {
  try {
    console.log("Received file:", fileData.name);

    // Write the file to a temporary location
    const fs = require("fs");
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