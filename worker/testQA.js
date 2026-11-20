const { extractText } = require("./documentProcessor");
const { processQueryJob } = require("./index");

async function testQA() {
    const documentText = await extractText("sample.py");

    const result = await processQueryJob(
        documentText,
        "What does this Python program do?"
    );

    console.log("Job result:");
    console.log(result);
}

testQA().catch((error) => {
    console.error("Test failed:", error.message);
});
