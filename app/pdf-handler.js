const pdfParse = require('pdf-parse');
const fs = require('fs');

async function extractText(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
}

module.exports = { extractText };
