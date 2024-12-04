import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  uploadPdf: async (fileData: { name: string; content: ArrayBuffer }) => {
    return await ipcRenderer.invoke("upload-pdf", fileData);
  },
});

contextBridge.exposeInMainWorld("dbAPI", {
  addDocument: (data: object) => ipcRenderer.invoke("db:add-document", data),
  getDocuments: () => ipcRenderer.invoke("db:get-documents"),
  updateDocument: (id: number, updates: object) =>
    ipcRenderer.invoke("db:update-document", { id, updates }),
  deleteDocument: (id: number) => ipcRenderer.invoke("db:delete-document", id),
});