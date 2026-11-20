const { ai } = require("./geminiService");

async function askGemini(documentText, question, onChunk) {
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContentStream({
                model: "gemini-3.7-flash",
                contents: `
                    Answer the user's question based on the following document.

                    Document:
                    ${documentText}

                    User's question:
                    ${question}
                `
            });

            let fullAnswer = "";

            for await (const chunk of response) {
                const text = chunk.text;

                if (text) {
                    fullAnswer += text;

                    if (onChunk) {
                        onChunk(text);
                    }
                }
            }

            return fullAnswer;

        } catch (error) {
            const isLastAttempt = attempt === maxRetries;

            if (isLastAttempt) {
                throw error;
            }

            const delay = (attempt + 1) * 3000;

            console.log(
                `Gemini request failed. Retrying in ${delay / 1000} seconds...`
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

module.exports = { askGemini };
