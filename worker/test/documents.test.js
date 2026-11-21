const assert = require("node:assert/strict");
const test = require("node:test");
const { processDocumentJob } = require("../index");
const { supported, invalid } = require("./fixtures");

for (const [name, bytes] of supported) {
    test(`extracts ${name}`, async () => {
        const result = await processDocumentJob(bytes, name);
        assert.equal(result.status, "completed");
        assert.match(result.text, /context marker/);
    });
}

for (const [name, bytes] of [...invalid, ["", Buffer.from("bytes")], ["invalid.txt", "not a buffer"]]) {
    test(`rejects ${name || "missing file name"}`, async () => {
        const result = await processDocumentJob(bytes, name);
        assert.equal(result.status, "failed");
        assert.ok(result.error);
    });
}
