import pdfParse from "pdf-parse";
import fs from 'fs';

export async function extractText(filePath: fs.PathOrFileDescriptor) {
    console.debug(`Received ${filePath} to extract from...`)
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        if (!data.text) {
            throw Error("No text found in pdf.");
        }
        console.debug(`******* ${data.text}`)
        return data.text;
    } catch (error: any) {
        console.error(`Could not read text from the pdf at ${filePath}`);
        throw error;
    }
}

