const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  executeCommand: (command) => ipcRenderer.invoke("execute-command", command),
  darkMode: {
    toggle: () => ipcRenderer.invoke("dark-mode:toggle"),
    system: () => ipcRenderer.invoke("dark-mode:system"),
  },
  uploadPdf: async (fileData) => {
    return await ipcRenderer.invoke("upload-pdf", fileData);
  },
});
