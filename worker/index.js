const { extractText } = require("./documentProcessor");
const { askGemini } = require("./llmService");

// Process a document processing job
async function processDocumentJob(filePath) {
    console.log("Starting document processing...");

    try {
        const text = await extractText(filePath);

        console.log("Document processing completed.");

        return {
            status: "completed",
            text: text
        };

    } catch (error) {
        console.error("Document processing failed:", error.message);

        return {
            status: "failed",
            error: error.message
        };
    }
}

// Process an LLM query job
async function processQueryJob(documentText, question, onChunk) {
    console.log("Starting LLM query...");

    try {
        const answer = await askGemini(
            documentText,
            question,
            onChunk
        );

        console.log("\nLLM query completed.");

        return {
            status: "completed",
            answer: answer
        };

    } catch (error) {
        console.error("LLM query failed:", error.message);

        return {
            status: "failed",
            error: error.message
        };
    }
}

module.exports = {
    processDocumentJob,
    processQueryJob
};
