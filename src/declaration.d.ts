export { };

declare global {
    interface Window {
        electronAPI: {
            uploadPdf: (fileData: { name: string; content: ArrayBuffer }) => Promise<{ success: boolean; summary: string }>;
            openEditor: (data: { id: number; summary: string }) => void;
            saveSummary: (updatedSummary: string) => void;
            loadSummary: (callback: (summary: string) => void) => void;
            onRefreshTable: (callback: () => void) => void;
            summarizeText: (text: string) => Promise<{ success: boolean; summary: string }>;
            extractText: (filePath: string) => Promise<
                | { success: true; text: string }
                | { success: false; error: string }>

        };

        dbAPI: {
            fetchDocuments: () => Promise<
                | { success: true; documents: DocumentAttributes[] }
                | { success: false; error: string }
            >;
            fetchDocument: (id: number) => Promise<{ success: boolean; document: any }>;

            uploadFile: () => Promise<{ success: boolean; message?: string }>;
            updateDocument: (id: number, updates: Partial<DocumentAttributes>) => Promise<{ success: boolean; error?: string }>;
            summarizeTextForPaper: (paperId: number, text: string, correction?: string) => Promise<{ success: boolean; summary?: string; error?: string }>;
            resetContextForPaper: (paperId: number) => Promise<{ success: boolean; error?: string }>;

        };

        modalAPI: {
            /**
             * Opens the summarization modal for a specific paper.
             * @param paperId - The unique ID of the paper to summarize.
             * @returns A promise that resolves when the modal is opened.
             */
            openSummarizationModal: (paperId: number) => Promise<void>;
        };
    }
}
