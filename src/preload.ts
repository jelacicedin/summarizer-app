import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  uploadPdf: async (fileData: { name: string; content: ArrayBuffer }) => {
    return await ipcRenderer.invoke("upload-pdf", fileData);
  },
  openEditor: (data: { id: number; summary: string }) =>
    ipcRenderer.send("open-editor", data),
  saveSummary: (updatedSummary: string) => ipcRenderer.send("save-summary", updatedSummary),

});

contextBridge.exposeInMainWorld("dbAPI", {
  uploadFile: () => ipcRenderer.invoke("upload-file"),
  fetchDocuments: () => ipcRenderer.invoke("fetch-documents"),
  updateDocument: (id: number, updates: object) =>
    ipcRenderer.invoke("update-document", { id, updates }),
});