const { extractText } = require("./documentProcessor");
const { askGemini } = require("./llmService");

// Process a document processing job
async function processDocumentJob(fileBuffer, fileName) {
    try {
        if (!Buffer.isBuffer(fileBuffer)) {
            throw new Error("The document task did not contain a file buffer.");
        }
        const text = await extractText(fileBuffer, fileName);

        return {
            status: "completed",
            text: text
        };

    } catch (error) {
        return {
            status: "failed",
            error: error.message.slice(0, 240)
        };
    }
}

// Process an LLM query job
async function processQueryJob(documents, question, onChunk, options) {
    try {
        const answer = await askGemini(
            documents,
            question,
            onChunk,
            options
        );

        return {
            status: "completed",
            answer: answer
        };

    } catch (error) {
        return {
            status: "failed",
            error: error.message,
            errorCategory: error.code
        };
    }
}

module.exports = {
    processDocumentJob,
    processQueryJob
};
