const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Document } = require('./database');
const { extractText } = require('./pdf-handler');
const { summarizeText } = require('./api');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    mainWindow.loadFile('index.html');
});

// IPC Handlers
ipcMain.handle('upload-pdf', async (event, filePath) => {
    try {
        const text = await extractText(filePath);
        const summary = await summarizeText(text);

        // Save to database
        const document = await Document.create({
            filename: path.basename(filePath),
            filePath,
            summary,
        });

        return document;
    } catch (err) {
        console.error(err);
        throw err;
    }
});
