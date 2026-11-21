const fs = require("fs");
const { processDocumentJob } = require("./index");

async function test() {
    const filePath = "test-document.txt";

    fs.writeFileSync(
        filePath,
        "This is a test document. It contains some sample text."
    );

    const result = await processDocumentJob(fs.readFileSync(filePath), filePath);

    console.log("Job result:");
    console.log(result);

    fs.unlinkSync(filePath);
}

test().catch(console.error);
