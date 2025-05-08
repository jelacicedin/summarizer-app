import { Sequelize, DataTypes, Model, Optional, Dialect } from "sequelize";
import "dotenv/config";
import path from "path";
import fs from "fs"; // Import the file system module

// Loading of auth from .env
let database: string;
let username: string;
let password: string;
let host: string;
const dialect: Dialect = "postgres";

if (process.env.DATABASE != undefined) {
  database = process.env.DATABASE;
} else {
  throw new Error("Database not defined in .env");
}

if (process.env.USERNAME != undefined) {
  username = "user";
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
  logging: console.log,
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
  datetimeLastModified?: Date;

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
  conversations?: string;
}

type DocumentCreationAttributes = Optional<
  DocumentAttributes,
  "id" | "datetimeAdded"
>;

// Extend the Sequelize Model class
export class Document
  extends Model<DocumentAttributes, DocumentCreationAttributes>
  implements DocumentAttributes
{
  public id!: number;
  public filename!: string;
  public filePath!: string;
  public title?: string;
  public authors?: string;
  public datetimeAdded?: Date;
  public datetimeCreated?: Date;
  public datetimeLastModified?: Date;

  // Stage 1
  public stage1Summary?: string;
  public approvalStage1?: boolean;

  // Stage 2
  public stage2Summary?: string;
  public approvalStage2?: boolean;

  // Stage 3
  public stage3Summary?: string;
  public approvalStage3?: boolean;

  public imageLinks?: string[];

  public published?: boolean;
  public notes?: string;
  public wherePublished?: string;

  public conversations?: string;
}

// Define the Sequelize model
Document.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    filename: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: true },
    authors: { type: DataTypes.STRING, allowNull: true },
    datetimeAdded: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    datetimeLastModified: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    approvalStage1: { type: DataTypes.BOOLEAN, defaultValue: false },
    stage1Summary: { type: DataTypes.TEXT, allowNull: true },
    approvalStage2: { type: DataTypes.BOOLEAN, defaultValue: false },
    stage2Summary: { type: DataTypes.TEXT, allowNull: true },
    approvalStage3: { type: DataTypes.BOOLEAN, defaultValue: false },
    stage3Summary: { type: DataTypes.TEXT, allowNull: true },
    imageLinks: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
    datetimeCreated: { type: DataTypes.DATE, allowNull: true },
    conversations: { type: DataTypes.TEXT, allowNull: true },
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
  datetimeLastModified?: Date;
}): Promise<void> {
  // Extract the folder path from the file path
  const folderPath = path.dirname(data.filePath);

  // Read all files in the folder
  const files = fs.readdirSync(folderPath);

  // Filter for .png and .jpg files
  const imageLinks = files
    .filter((file) => file.endsWith(".png") || file.endsWith(".jpg"))
    .map((file) => path.join(folderPath, file)); // Get absolute paths

  // Create the document in the database
  const document = await Document.create({
    filename: data.filename,
    filePath: data.filePath,
    title: data.title,
    authors: data.authors,
    datetimeAdded: data.datetimeAdded,
    datetimeLastModified: data.datetimeLastModified,
    imageLinks, // Attach the image links
  });

  // Log the created document to verify the ID
  console.log("Document created:", document.toJSON());
}

export async function getDocuments(): Promise<Document[]> {
  return await Document.findAll();
}

export async function updateDocument(
  id: number,
  updates: Partial<Omit<DocumentAttributes, "id">>
): Promise<void> {
  await Document.update(
    {
      ...updates,
      datetimeLastModified: new Date(), // ✅ Set current timestamp
    },
    {
      where: { id },
    }
  );
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

/**
 * Fetch the Stage 3 Summary for a given document ID.
 * @param id - The ID of the document.
 * @returns A Promise that resolves to the Stage 3 Summary string or null if not found.
 */
export async function getStage3Summary(id: number): Promise<string | null> {
  try {
    console.debug("Fetching Stage 3 Summary for document ID:", id);

    const document = await Document.findByPk(id, {
      attributes: ["stage3Summary"],
    });

    if (!document) {
      console.error(`Document with ID ${id} not found.`);
      return null;
    }

    return document.stage3Summary || null;
  } catch (error) {
    console.error(
      `Error fetching Stage 3 Summary for document ID: ${id}`,
      error
    );
    throw error;
  }
}

/**
 * Fetch the folder path where the PDF file for a given document ID is located.
 * @param id - The ID of the document.
 * @returns A Promise that resolves to the absolute folder path or null if not found.
 */
export async function getPdfFolderPath(id: number): Promise<string | null> {
  try {
    console.debug("Fetching PDF folder path for document ID:", id);

    const document = await Document.findByPk(id, {
      attributes: ["filePath"],
    });

    if (!document) {
      console.error(`Document with ID ${id} not found.`);
      return null;
    }

    if (!document.filePath) {
      console.error(`Document with ID ${id} missing filePath.`);
      return null;
    }

    const folderPath = path.dirname(document.filePath);
    return folderPath;
  } catch (error) {
    console.error(
      `Error fetching PDF folder path for document ID: ${id}`,
      error
    );
    throw error;
  }
}

/**
 * Copies the Stage 1 Summary into Stage 2 Summary for a document by ID.
 * @param id - The ID of the document.
 * @returns A Promise that resolves to true if successful.
 */
export async function copyStage1ToStage2(id: number): Promise<boolean> {
  try {
    console.debug("Copying Stage 1 Summary to Stage 2 for document ID:", id);

    const document = await Document.findByPk(id);
    if (!document || !document.stage1Summary) {
      console.error(
        `Document with ID ${id} not found or missing Stage 1 Summary.`
      );
      return false;
    }

    document.stage2Summary = document.stage1Summary;
    await document.save();
    return true;
  } catch (error) {
    console.error(
      `Error copying Stage 1 Summary to Stage 2 for document ID: ${id}`,
      error
    );
    return false;
  }
}

/**
 * Copies the Stage 2 Summary into Stage 3 Summary for a document by ID.
 * @param id - The ID of the document.
 * @returns A Promise that resolves to true if successful.
 */
export async function copyStage2ToStage3(id: number): Promise<boolean> {
  try {
    console.debug("Copying Stage 2 Summary to Stage 3 for document ID:", id);

    const document = await Document.findByPk(id);
    if (!document || !document.stage2Summary) {
      console.error(
        `Document with ID ${id} not found or missing Stage 2 Summary.`
      );
      return false;
    }

    document.stage3Summary = document.stage2Summary;
    await document.save();
    return true;
  } catch (error) {
    console.error(
      `Error copying Stage 2 Summary to Stage 3 for document ID: ${id}`,
      error
    );
    return false;
  }
}

/**
 * Get the conversation thread for a given document.
 */
export async function getConversationById(id: number): Promise<string | null> {
  const document = await Document.findByPk(id, {
    attributes: ["conversations"],
  });
  return document?.conversations || null;
}

/**
 * Save the conversation thread for a given document.
 */
export async function saveConversation(
  id: number,
  conversation: string
): Promise<void> {
  const document = await Document.findByPk(id);
  if (document) {
    document.conversations = conversation;
    await document.save();
  }
}
