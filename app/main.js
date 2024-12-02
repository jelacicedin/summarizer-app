const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const { Document } = require("./database");
const { extractText } = require("./pdf-handler");
const { summarizeText } = require("./api");

let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        show: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        }
    })
}

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile("index.html");
});

app.whenReady().then(() => {
  createSplashScreen();
  createMainWindow();
  startPythonServer();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });

  app.on("window-all-closed", () => {
    // Close the app if all windows are closed (except on macOS)
    if (process.platform !== "darwin") {
      if (pythonProcess) {
        pythonProcess.kill(); // Terminate the Python process
      }
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
