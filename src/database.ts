import { Sequelize, DataTypes } from "sequelize";

// Database connection
export const sequelize = new Sequelize("app_db", "user", "password", {
    host: "localhost",
    dialect: "postgres",
});

// Define the `Document` model
export const Document = sequelize.define("Document", {
    filename: { type: DataTypes.STRING, allowNull: false }, // PDF filename
    filePath: { type: DataTypes.STRING, allowNull: false }, // Path to the file
    title: { type: DataTypes.STRING, allowNull: true }, // Title of the document
    authors: { type: DataTypes.STRING, allowNull: true }, // Comma-separated authors
    metadata: { type: DataTypes.JSON, allowNull: true }, // Additional metadata (JSON format)
    summarized: { type: DataTypes.BOOLEAN, defaultValue: false }, // Summarized status
    summary: { type: DataTypes.TEXT, allowNull: true }, // Generated summary
    approved: { type: DataTypes.BOOLEAN, defaultValue: false }, // Approved status
    approvedSummary: { type: DataTypes.TEXT, allowNull: true }, // Approved summary
    refinedText: { type: DataTypes.TEXT, allowNull: true }, // Text refined for LinkedIn
    imageLinks: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true }, // Array of image URLs
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, // Creation timestamp
});

// Sync database
sequelize
    .sync({ alter: true }) // Updates database schema if needed
    .then(() => console.log("Database synced"))
    .catch((err) => console.error("Error syncing database:", err));


export async function addDocument(data: {
    filename: string;
    filePath: string;
    title?: string;
    authors?: string;
    metadata?: object;
}): Promise<void> {
    await Document.create({
        filename: data.filename,
        filePath: data.filePath,
        title: data.title,
        authors: data.authors,
        metadata: data.metadata,
    });
}

export async function getDocuments(): Promise<any[]> {
    return await Document.findAll();
}


export async function updateDocument(
    id: number,
    updates: {
        summary?: string;
        approved?: boolean;
        approvedSummary?: string;
        refinedText?: string;
        imageLinks?: string[];
    }
): Promise<void> {
    await Document.update(updates, {
        where: { id },
    });
}


export async function deleteDocument(id: number): Promise<void> {
    await Document.destroy({
        where: { id },
    });
}
