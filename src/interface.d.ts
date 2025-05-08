export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface IElectronAPI {
  uploadPdf: (fileData: { name: string; content: ArrayBuffer }) => Promise<any>;
  scanFolder: () => Promise<any>;
  openEditor: (data: { id: number; summary: string }) => void;
  loadSummary: (callback: (summary: string) => void) => void;
  saveSummary: (updatedSummary: string) => void;
  onRefreshTable: (callback: () => void) => void;
  extractText: (filePath: string) => Promise<string>;
  on: (channel: string, callback: (args: any[]) => void) => void;
  onToggleDarkMode: (callback: () => void) => void;
  getPrompts: () => Promise<Record<string, string>>;
  setPrompt: (prompt: string) => void;
}

export interface IModalAPI {
  openSummarizationModal: (paperId: number, stage: number) => Promise<void>;
  fetchSummary: (paperId: number) => Promise<string | null>;
  fetchFilePath: (paperId: number) => Promise<string>;
  extractText: (filePath: string) => Promise<string>;
  generateSummary: (paperId: number, text: string) => Promise<string>;
  updateSummary: (paperId: number, correction: string) => Promise<string>;
  sendSummaryToDb: (paperId: number, text: string) => void;
  onSummarizationModal: (callback: (paperId: number) => void) => void; // Add this
  refreshTable: () => void;
  summarizeDocument: (
    paperId: number,
    messages: Message[]
  ) => Promise<{ summary: string }>;
}

export interface IDBAPI {
  uploadFile: () => Promise<any>;
  fetchDocuments: () => Promise<any>;
  fetchDocument: (id: number) => Promise<any>;
  updateDocument: (id: number, updates: object) => Promise<any>;
  summarizeTextForPaper: (
    paperId: number,
    text: string,
    correction?: string
  ) => Promise<string>;
  resetContextForPaper: (paperId: number) => Promise<void>;
  getStage3Summary: (paperId: number) => Promise<string>;
  copyStage1ToStage2: (paperId: number) => Promise<boolean>;
  copyStage2ToStage3: (paperId: number) => Promise<boolean>;
  saveConversation: (paperId: number, conversation: string) => Promise<void>;
  getConversation: (paperId: number) => Promise<string>;
  deleteDocument: (paperId: number) => Promise<void>;
}

export interface IExportAPI {
  exportDocument: (
    paperId: number
  ) => Promise<{ success: boolean; path: string }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    dbAPI: IDBAPI;
    modalAPI: IModalAPI;
    exportAPI: IExportAPI;
  }
}
