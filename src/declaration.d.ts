export { };

declare global {
    interface Window {
        electronAPI: {
            uploadPdf: (fileData: { name: string; content: ArrayBuffer }) => Promise<{ success: boolean; summary: string }>;
            openEditor: (data: { id: number; summary: string }) => void;
            saveSummary: (updatedSummary: string) => void;
        };

        dbAPI: {
            fetchDocuments: () => Promise<
                | { success: true; documents: DocumentAttributes[] }
                | { success: false; error: string }
            >;
            uploadFile: () => Promise<{ success: boolean; message?: string }>;
            updateDocument: (id: number, updates: Partial<DocumentAttributes>) => Promise<{ success: boolean; error?: string }>;
        };
    }
}
