import { Sequelize, DataTypes, Model, Optional } from "sequelize";

// Database connection
export const sequelize = new Sequelize("app_db", "user", "password", {
    host: "localhost",
    dialect: "postgres",
});

// Define TypeScript interface for the Document
interface DocumentAttributes {
    id: number;
    filename: string;
    filePath: string;
    title?: string;
    authors?: string;
    metadata?: object;
    summarized?: boolean;
    summary?: string;
    approved?: boolean;
    approvedSummary?: string;
    refinedText?: string;
    imageLinks?: string[];
    createdAt?: Date;
}

interface DocumentCreationAttributes extends Optional<DocumentAttributes, "id" | "createdAt"> { }

// Extend the Sequelize Model class
export class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
    public id!: number;
    public filename!: string;
    public filePath!: string;
    public title?: string;
    public authors?: string;
    public metadata?: object;
    public summarized?: boolean;
    public summary?: string;
    public approved?: boolean;
    public approvedSummary?: string;
    public refinedText?: string;
    public imageLinks?: string[];
    public createdAt?: Date;
}

// Define the Sequelize model
Document.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        filename: { type: DataTypes.STRING, allowNull: false },
        filePath: { type: DataTypes.STRING, allowNull: false },
        title: { type: DataTypes.STRING, allowNull: true },
        authors: { type: DataTypes.STRING, allowNull: true },
        metadata: { type: DataTypes.JSON, allowNull: true },
        summarized: { type: DataTypes.BOOLEAN, defaultValue: false },
        summary: { type: DataTypes.TEXT, allowNull: true },
        approved: { type: DataTypes.BOOLEAN, defaultValue: false },
        approvedSummary: { type: DataTypes.TEXT, allowNull: true },
        refinedText: { type: DataTypes.TEXT, allowNull: true },
        imageLinks: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
        sequelize,
        modelName: "Document",
    }
);

// Sync database
sequelize
    .sync({ alter: true }) // Updates database schema if needed
    .then(() => console.log("Database synced"))
    .catch((err) => console.error("Error syncing database:", err));


export async function addDocument(data: Omit<DocumentAttributes, "id" | "createdAt">): Promise<void> {
    await Document.create(data);
}


export async function getDocuments(): Promise<Document[]> {
    return await Document.findAll();
}


export async function updateDocument(
    id: number,
    updates: Partial<Omit<DocumentAttributes, "id">>
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