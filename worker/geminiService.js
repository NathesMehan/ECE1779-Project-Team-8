const { GoogleGenAI } = require("@google/genai");

let ai;

function getGeminiClient() {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) require("dotenv").config({ quiet: true });
        if (!process.env.GEMINI_API_KEY) {
            throw Object.assign(new Error("Gemini is not configured."), { code: "configuration" });
        }

        ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            vertexai: false,
            httpOptions: { retryOptions: { attempts: 1 } }
        });
    }
    return ai;
}

module.exports = { getGeminiClient };
