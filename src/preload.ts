import { contextBridge, ipcRenderer } from "electron";

// Define types for the modalAPI
interface ModalAPI {
  openSummarizationModal: (paperId: number) => Promise<void>;
  fetchSummary: (paperId: number) => Promise<string | null>;
  fetchFilePath: (paperId: number) => Promise<string>;
  extractText: (filePath: string) => Promise<string>;
  generateSummary: (paperId: number, text: string) => Promise<string>;
  updateSummary: (paperId: number, correction: string) => Promise<string>;
}

// Define types for the dbAPI
interface DbAPI {
  uploadFile: () => Promise<void>;
  fetchDocuments: () => Promise<any[]>;
  fetchDocument: (id: number) => Promise<any>;
  updateDocument: (id: number, updates: object) => Promise<void>;
  summarizeTextForPaper: (
    paperId: number,
    text: string,
    correction?: string
  ) => Promise<string>;
  resetContextForPaper: (paperId: number) => Promise<void>;
}

// Define types for the electronAPI
interface ElectronAPI {
  uploadPdf: (fileData: { name: string; content: ArrayBuffer }) => Promise<any>;
  openEditor: (data: { id: number; summary: string }) => void;
  loadSummary: (callback: (summary: string) => void) => void;
  saveSummary: (updatedSummary: string) => void;
  onRefreshTable: (callback: () => void) => void;
  summarizeText: (text: string) => Promise<string>;
  extractText: (filePath: string) => Promise<string>;
}

// Expose APIs to the Renderer process
contextBridge.exposeInMainWorld("electronAPI", <ElectronAPI>{
  uploadPdf: async (fileData) => ipcRenderer.invoke("upload-pdf", fileData),
  openEditor: (data) => ipcRenderer.send("open-editor", data),
  loadSummary: (callback) => ipcRenderer.on("load-summary", (event, summary) => callback(summary)),
  saveSummary: (updatedSummary) => ipcRenderer.send("save-summary", updatedSummary),
  onRefreshTable: (callback) => ipcRenderer.on("refresh-table", callback),
  summarizeText: (text) => ipcRenderer.invoke("summarize-text", text),
  extractText: (filePath) => ipcRenderer.invoke("extract-text", filePath),
});

contextBridge.exposeInMainWorld("dbAPI", <DbAPI>{
  uploadFile: () => ipcRenderer.invoke("upload-file"),
  fetchDocuments: () => ipcRenderer.invoke("fetch-documents"),
  fetchDocument: (id) => ipcRenderer.invoke("fetch-document", id),
  updateDocument: (id, updates) => ipcRenderer.invoke("update-document", { id, updates }),
  summarizeTextForPaper: (paperId, text, correction) =>
    ipcRenderer.invoke("summarize-text-for-paper", paperId, text, correction),
  resetContextForPaper: (paperId) => ipcRenderer.invoke("reset-context-for-paper", paperId),
});

contextBridge.exposeInMainWorld("modalAPI", <ModalAPI>{
  openSummarizationModal: (paperId) => ipcRenderer.invoke("open-summarization-modal", paperId),
  fetchSummary: (paperId) => ipcRenderer.invoke("fetch-summary", paperId),
  fetchFilePath: (paperId) => ipcRenderer.invoke("fetch-file-path", paperId),
  extractText: (filePath) => ipcRenderer.invoke("extract-text", filePath),
  generateSummary: (paperId, text) => ipcRenderer.invoke("generate-summary", paperId, text),
  updateSummary: (paperId, correction) => ipcRenderer.invoke("update-summary", paperId, correction),
});
