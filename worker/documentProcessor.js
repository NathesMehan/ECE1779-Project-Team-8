const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(filePath) {
    const extension = filePath.split(".").pop().toLowerCase();

    if (extension === "pdf") {
        const dataBuffer = fs.readFileSync(filePath);

        const parser = new PDFParse({
            data: dataBuffer
        });

        try {
            const result = await parser.getText();
            return result.text;
        } finally {
            await parser.destroy();
        }
    }

    if (extension === "docx") {
        const result = await mammoth.extractRawText({
            path: filePath
        });
        return result.value;
    }

    if (extension === "txt" || extension === "md" || extension === "py") {
        return fs.readFileSync(filePath, "utf8");
    }

    throw new Error("Unsupported file type");
}

module.exports = { extractText };
