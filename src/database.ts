import { Sequelize, DataTypes, Model, Optional, Dialect } from "sequelize";
import 'dotenv/config'

// Loading of auth from .env
let database: string;
let username: string;
let password: string;
let host: string;
let dialect: Dialect = "postgres";



if (process.env.DATABASE != undefined) {
    database = process.env.DATABASE;
} else {
    throw new Error("Database not defined in .env");
}

if (process.env.USERNAME != undefined) {
    username = process.env.USERNAME;
} else {
    throw new Error("Username not defined in .env");
}
if (process.env.HOST != undefined) {
    host = process.env.HOST;
} else {
    throw new Error("Host not defined in .env");
}
if (process.env.PASSWORD != undefined) {
    password = process.env.PASSWORD;
} else {
    throw new Error("Password not defined in .env");
}


// Database connection
export const sequelize = new Sequelize(database, username, password, {
    host: host,
    dialect: dialect,
    logging: console.log
});

// Define TypeScript interface for the Document
interface DocumentAttributes {
    id: number;
    filename: string;
    filePath: string;
    title?: string;
    authors?: string;
    datetimeAdded?: Date;
    datetimeCreated?: Date;

    // Stage 1
    stage1Summary?: string;
    approvalStage1?: boolean;

    // Stage 2
    stage2Summary?: string;
    approvalStage2?: boolean;

    // Stage 3
    stage3Summary?: string;
    approvalStage3?: boolean;

    imageLinks?: string[];

    published?: boolean;
    notes?: string;
    wherePublished?: string;
}

interface DocumentCreationAttributes extends Optional<DocumentAttributes, "id" | "datetimeAdded"> { }

// Extend the Sequelize Model class
export class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
    public id!: number;
    public filename!: string;
    public filePath!: string;
    public title?: string;
    public authors?: string;
    public datetimeAdded?: Date;
    public datetimeCreated?: Date;

    // Stage 1
    public stage1Summary?: string;
    public approvalStage1?: boolean;

    // Stage 2
    public stage2Summary?: string;
    public approvalStage2?: boolean;

    // Stage 3
    public approvalStage3?: boolean;

    public imageLinks?: string[];

    public published?: boolean;
    public notes?: string;
    public wherePublished?: string;
}

// Define the Sequelize model
Document.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        filename: { type: DataTypes.STRING, allowNull: false },
        filePath: { type: DataTypes.STRING, allowNull: false },
        title: { type: DataTypes.STRING, allowNull: true },
        authors: { type: DataTypes.STRING, allowNull: true },
        datetimeAdded: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
        approvalStage1: { type: DataTypes.BOOLEAN, defaultValue: false },
        stage1Summary: { type: DataTypes.TEXT, allowNull: true }, approvalStage2: { type: DataTypes.BOOLEAN, defaultValue: false },
        stage2Summary: { type: DataTypes.TEXT, allowNull: true }, approvalStage3: { type: DataTypes.BOOLEAN, defaultValue: false },
        stage3Summary: { type: DataTypes.TEXT, allowNull: true },
        imageLinks: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
        datetimeCreated: { type: DataTypes.DATE, allowNull: true },
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


export async function addDocument(data: {
    filename: string;
    filePath: string;
    title?: string;
    authors?: string;
    datetimeAdded?: Date;
}): Promise<void> {
    const document = await Document.create({
        filename: data.filename,
        filePath: data.filePath,
        title: data.title,
        authors: data.authors,
        datetimeAdded: data.datetimeAdded,
    });

    // Log the created document to verify the ID
    console.log("Document created:", document.toJSON());

    // return document;
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


/**
 * Fetch a single document by its ID.
 * @param id - The ID of the document to fetch.
 * @returns A Promise that resolves to the document object or null if not found.
 */
export async function fetchDocument(id: number): Promise<Document | null> {
    try {

        console.debug("Attempting to fetch document by primary key:", id);
        // Run a raw SQL query
        const document = await Document.findByPk(id);

        if (!document) {
            console.error(`Document with ID ${id} not found.`);
            return null;
        }
        return document;
    } catch (error) {
        console.error(`Error fetching document with ID: ${id}`, error);
        throw error;
    }
}
