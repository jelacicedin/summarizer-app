export { };

declare global {
    interface Window {
        electronAPI: {
            uploadPdf: (fileData: { name: string; content: ArrayBuffer }) => Promise<{ success: boolean; summary: string }>;
        };

        dbAPI: {
            fetchDocuments: () => Promise<{}>;
            uploadFile: () => Promise<{}>;
            updateDocument: (id: number, updates: object) => Promise<{}>;
        }
    }
}
