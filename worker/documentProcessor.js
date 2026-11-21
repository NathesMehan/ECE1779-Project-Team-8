const fs = require("fs/promises");
const { extname } = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(filePathOrBuffer, fileName) {
    const isBuffer = Buffer.isBuffer(filePathOrBuffer);
    const name = isBuffer ? fileName : filePathOrBuffer;

    if (typeof name !== "string" || !name.trim() || name.includes("\0")) {
        throw new Error("A valid file name is required.");
    }
    const extension = extname(name).toLowerCase();
    if (![".pdf", ".docx", ".txt", ".md", ".py"].includes(extension)) {
        throw new Error("Unsupported file type.");
    }

    const dataBuffer = isBuffer ? filePathOrBuffer : await fs.readFile(filePathOrBuffer);
    if (!dataBuffer.length) {
        throw new Error("The file is empty.");
    }

    const text = await extractFileText(dataBuffer, extension);
    if (!text.trim()) {
        throw new Error("The file has no extractable text.");
    }
    if (text.includes("\0")) {
        throw new Error("The extracted text contains unsupported null characters.");
    }
    return text;
}

async function extractFileText(dataBuffer, extension) {
    if (extension === ".pdf") {
        const parser = new PDFParse({
            data: dataBuffer
        });

        try {
            const result = await parser.getText({ pageJoiner: "" });
            return result.text;
        } finally {
            await parser.destroy();
        }
    }

    if (extension === ".docx") {
        const result = await mammoth.extractRawText({
            buffer: dataBuffer
        });
        return result.value;
    }

    return new TextDecoder("utf-8", { fatal: true }).decode(dataBuffer);
}

module.exports = { extractText };
