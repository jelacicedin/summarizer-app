import pdfParse from "pdf-parse";
import fs from 'fs';

export async function extractText(filePath: fs.PathOrFileDescriptor) {
    console.debug(`Received ${filePath} to extract from...`)
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
}

