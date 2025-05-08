import { contextBridge, ipcRenderer } from "electron";
import { IElectronAPI, IDBAPI, IModalAPI, IExportAPI } from "./interface";
// Expose APIs to the Renderer process
contextBridge.exposeInMainWorld("electronAPI", <IElectronAPI>{
  uploadPdf: async (fileData) => ipcRenderer.invoke("upload-pdf", fileData),
  openEditor: (data) => ipcRenderer.send("open-editor", data),
  loadSummary: () => ipcRenderer.invoke("load-summary"),
  saveSummary: (updatedSummary) =>
    ipcRenderer.send("save-summary", updatedSummary),
  onRefreshTable: (callback) => ipcRenderer.on("refresh-table", callback),
  extractText: (filePath) => ipcRenderer.invoke("extract-text", filePath),
  on: (channel: string, callback: (...args: any[]) => void) =>
    ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  onToggleDarkMode: (callback: () => void) =>
    ipcRenderer.on("toggle-dark-mode", callback),
});

contextBridge.exposeInMainWorld("dbAPI", <IDBAPI>{
  uploadFile: () => ipcRenderer.invoke("upload-file"),
  fetchDocuments: () => ipcRenderer.invoke("fetch-documents"),
  fetchDocument: (id) => ipcRenderer.invoke("fetch-document", id),
  updateDocument: (id, updates) =>
    ipcRenderer.invoke("update-document", { id, updates }),
  summarizeTextForPaper: (paperId, text, correction) =>
    ipcRenderer.invoke("summarize-text-for-paper", paperId, text, correction),
  resetContextForPaper: (paperId) =>
    ipcRenderer.invoke("reset-context-for-paper", paperId),
  getStage3Summary: (paperId) =>
    ipcRenderer.invoke("get-stage3-summary", paperId),
  copyStage1ToStage2: (paperId) =>
    ipcRenderer.invoke("copy-stage1-to-stage2", paperId),
  copyStage2ToStage3: (paperId) =>
    ipcRenderer.invoke("copy-stage2-to-stage3", paperId),
  saveConversation: (paperId, conversation) =>
    ipcRenderer.invoke("save-conversation", paperId, conversation),
  getConversation: (paperId) => ipcRenderer.invoke("get-conversation", paperId),
});

contextBridge.exposeInMainWorld("modalAPI", <IModalAPI>{
  openSummarizationModal: (paperId, stage) =>
    ipcRenderer.invoke("open-summarization-modal", paperId, stage),
  fetchSummary: (paperId) => ipcRenderer.invoke("fetch-summary", paperId),
  fetchFilePath: (paperId) => ipcRenderer.invoke("fetch-file-path", paperId),
  extractText: (filePath) => ipcRenderer.invoke("extract-text", filePath),
  generateSummary: (paperId, text) =>
    ipcRenderer.invoke("generate-summary", paperId, text),
  updateSummary: (paperId, correction) =>
    ipcRenderer.invoke("update-summary", paperId, correction),
  onSummarizationModal: (callback: any) => {
    ipcRenderer.on("open-summarization-modal", (event, paperId) => {
      callback(paperId);
    });
  },
  refreshTable: () => ipcRenderer.send("refresh-table"), // Notify the main process to refresh the table
  sendSummaryToDb: (paperId, text) =>
    ipcRenderer.invoke("send-summary-to-db", paperId, text),
  summarizeDocument: (paperId, messages) =>
    ipcRenderer.invoke("summarize-document", paperId, messages),
});

contextBridge.exposeInMainWorld("exportAPI", <IExportAPI>{
  exportDocument: (paperId) => ipcRenderer.invoke("export-document", paperId),
});
