
const { processDocumentJob } = require("./index");

async function test() {
    const result = await processDocumentJob("sample.py");

    console.log("Job result:");
    console.log(result);
}

test();
