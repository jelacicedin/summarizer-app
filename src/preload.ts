import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  uploadPdf: async (fileData: { name: string; content: ArrayBuffer }) => {
    return await ipcRenderer.invoke("upload-pdf", fileData);
  },
});

contextBridge.exposeInMainWorld("dbAPI", {
  uploadFile: () => ipcRenderer.invoke("upload-file"),
  fetchDocuments: () => ipcRenderer.invoke("fetch-documents"),
  updateDocument: (id: number, updates: object) =>
    ipcRenderer.invoke("update-document", { id, updates }),
});