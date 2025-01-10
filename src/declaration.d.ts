interface ModalAPI {
    openSummarizationModal: (paperId: number) => Promise<void>;
    fetchSummary: (paperId: number) => Promise<string | null>;
    fetchFilePath: (paperId: number) => Promise<string>;
    extractText: (filePath: string) => Promise<string>;
    generateSummary: (paperId: number, text: string) => Promise<string>;
    updateSummary: (paperId: number, correction: string) => Promise<string>;
  }
  
  interface DbAPI {
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
  }
  
  interface ElectronAPI {
    uploadPdf: (fileData: { name: string; content: ArrayBuffer }) => Promise<any>;
    openEditor: (data: { id: number; summary: string }) => void;
    loadSummary: (callback: (summary: string) => void) => void;
    saveSummary: (updatedSummary: string) => void;
    onRefreshTable: (callback: () => void) => void;
    summarizeText: (text: string) => Promise<string>;
    extractText: (filePath: string) => Promise<string>;
  }
  
  interface Window {
    modalAPI: ModalAPI;
    dbAPI: DbAPI;
    electronAPI: ElectronAPI;
  }
  