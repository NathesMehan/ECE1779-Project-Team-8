const { extractText } = require("./documentProcessor");

async function test() {
    const text = "This text comes directly from a Buffer.";

    const buffer = Buffer.from(text, "utf8");

    const result = await extractText(buffer, "sample.txt");

    console.log("Extracted text:");
    console.log(result);
}

test().catch(console.error);
