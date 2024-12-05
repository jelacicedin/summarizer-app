import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  uploadPdf: async (fileData: { name: string; content: ArrayBuffer }) => {
    return await ipcRenderer.invoke("upload-pdf", fileData);
  },
  openEditor: (data: { id: number; summary: string }) =>
    ipcRenderer.send("open-editor", data),
  loadSummary: (callback: (summary: string) => void) => {
    ipcRenderer.on("load-summary", (event, summary) => callback(summary));
  },
  saveSummary: (updatedSummary: string) => {
    ipcRenderer.send("save-summary", updatedSummary);
  },
  onRefreshTable: (callback: () => void) => {
    ipcRenderer.on("refresh-table", () => callback());
  },

});

contextBridge.exposeInMainWorld("dbAPI", {
  uploadFile: () => ipcRenderer.invoke("upload-file"),
  fetchDocuments: () => ipcRenderer.invoke("fetch-documents"),
  updateDocument: (id: number, updates: object) =>
    ipcRenderer.invoke("update-document", { id, updates }),
});