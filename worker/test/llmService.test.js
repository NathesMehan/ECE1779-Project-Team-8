const assert = require("node:assert/strict");
const test = require("node:test");
const { askGemini } = require("../llmService");

const documents = [{ name: "notes.txt", text: "The project uses PostgreSQL." }];
const question = "What database does the project use?";
const stop = { candidates: [{ finishReason: "STOP" }] };

function mockedStream(...attempts) {
    const calls = [];
    const delays = [];
    return {
        calls,
        delays,
        options: {
            sleep: async delay => delays.push(delay),
            client: {
                models: {
                    async generateContentStream(request) {
                        const events = attempts[calls.length];
                        calls.push(request);
                        if (events instanceof Error) throw events;
                        if (typeof events === "function") return events(request);
                        return (async function* () {
                            for (const event of events) {
                                if (event instanceof Error) throw event;
                                yield event;
                            }
                        })();
                    }
                }
            }
        }
    };
}

test("streams chunks and sends clearly separated question and documents", async () => {
    const mock = mockedStream([{ text: "Postgre" }, { text: "SQL" }, stop]);
    const chunks = [];
    assert.equal(await askGemini(documents, question, chunk => chunks.push(chunk), mock.options), "PostgreSQL");
    assert.deepEqual(chunks, ["Postgre", "SQL"]);
    assert.deepEqual(JSON.parse(mock.calls[0].contents), { question, documents });
    assert.ok(mock.calls[0].config.systemInstruction);
});

test("defaults to Gemini 3.5 Flash-Lite and respects an explicit model", async () => {
    const previous = process.env.GEMINI_MODEL;
    const mock = mockedStream([{ text: "PostgreSQL" }, stop], [{ text: "PostgreSQL" }, stop]);
    try {
        delete process.env.GEMINI_MODEL;
        await askGemini(documents, question, undefined, mock.options);
        assert.equal(mock.calls[0].model, "gemini-3.5-flash-lite");

        process.env.GEMINI_MODEL = "gemini-3.5-flash";
        await askGemini(documents, question, undefined, mock.options);
        assert.equal(mock.calls[1].model, "gemini-3.5-flash");
    } finally {
        if (previous === undefined) delete process.env.GEMINI_MODEL;
        else process.env.GEMINI_MODEL = previous;
    }
});

test("retries a 429 before the first chunk and respects Google RetryInfo", async () => {
    const details = [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "4s" }];
    const rateLimit = Object.assign(new Error(JSON.stringify({ error: { details } })), { status: 429 });
    const mock = mockedStream(rateLimit, [{ text: "PostgreSQL" }, stop]);
    assert.equal(await askGemini(documents, question, undefined, mock.options), "PostgreSQL");
    assert.deepEqual(mock.delays, [4000]);
});

test("retries an interrupted upstream stream when no callback received its text", async () => {
    const unavailable = Object.assign(new Error("service unavailable"), {
        status: 503, headers: new Headers({ "Retry-After": "5" })
    });
    const mock = mockedStream([{ text: "discard this partial answer" }, unavailable], [{ text: "PostgreSQL" }, stop]);
    assert.equal(await askGemini(documents, question, undefined, mock.options), "PostgreSQL");
    assert.deepEqual(mock.delays, [5000]);
});

test("does not retry permanent authentication errors", async () => {
    const mock = mockedStream(Object.assign(new Error("provider details"), { status: 403 }));
    await assert.rejects(askGemini(documents, question, undefined, mock.options), { code: "authentication" });
    assert.equal(mock.calls.length, 1);
});

test("aborts requests that time out and stops after three attempts", async () => {
    const hang = () => new Promise(() => {});
    const mock = mockedStream(hang, hang, hang);
    await assert.rejects(askGemini(documents, question, undefined, { ...mock.options, timeoutMs: 5 }), { code: "timeout" });
    assert.equal(mock.calls.length, 3);
    assert.ok(mock.calls.every(call => call.config.abortSignal.aborted));
});

test("does not replay a partial answer sent to the callback", async () => {
    const cut = Object.assign(new Error("connection closed"), { code: "ECONNRESET" });
    const mock = mockedStream([{ text: "Postgre" }, cut]);
    const chunks = [];
    await assert.rejects(askGemini(documents, question, chunk => chunks.push(chunk), mock.options), { code: "network" });
    assert.deepEqual(chunks, ["Postgre"]);
    assert.equal(mock.calls.length, 1);
});

for (const [name, events] of [
    ["empty", [stop]],
    ["incomplete", [{ text: "partial" }]],
    ["blocked", [{ promptFeedback: { blockReason: "SAFETY" } }]]
]) {
    test(`rejects a stream that is ${name}`, async () => {
        const mock = mockedStream(events);
        await assert.rejects(askGemini(documents, question, undefined, mock.options), { code: "invalid_response" });
        assert.equal(mock.calls.length, 1);
    });
}

test("rejects oversize context before contacting Gemini", async () => {
    const mock = mockedStream();
    await assert.rejects(askGemini(documents, "语".repeat(128000), undefined, mock.options), { code: "input_budget" });
    assert.equal(mock.calls.length, 0);
});
