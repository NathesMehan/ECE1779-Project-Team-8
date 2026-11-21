// Requires Node 24 and isolated installations of @electric-sql/pglite and
// @electric-sql/pglite-socket (available via NODE_PATH). Run from worker/:
// node --env-file=.env scripts/gemini-smoke.js
// Add --long-backoff to try minimum 10 s / 20 s delays in this smoke test only.
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { setTimeout: sleep } = require("node:timers/promises");

const rpcStatuses = new Set([
    "UNAVAILABLE", "DEADLINE_EXCEEDED", "RESOURCE_EXHAUSTED", "INTERNAL",
    "INVALID_ARGUMENT", "PERMISSION_DENIED", "UNAUTHENTICATED", "NOT_FOUND"
]);

function recordProviderError(trace, error) {
    const httpStatus = Number(error.status);
    if (Number.isInteger(httpStatus) && httpStatus >= 400 && httpStatus <= 599) {
        trace.httpStatus = httpStatus;
    }
    try {
        const rpc = JSON.parse(error.message).error;
        if (rpcStatuses.has(rpc?.status)) trace.rpcStatus = rpc.status;
        const message = typeof rpc?.message === "string" ? rpc.message : "";
        if (/overload|capacity|high demand/i.test(message)) trace.providerSummary = "capacity";
        else if (/gateway|upstream|connection reset/i.test(message)) trace.providerSummary = "gateway";
        else if (/service unavailable|temporarily unavailable/i.test(message)) trace.providerSummary = "unavailable";
        const retryDelay = rpc?.details?.find(detail =>
            detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo")?.retryDelay;
        if (typeof retryDelay === "string" && /^\d+(\.\d+)?s$/.test(retryDelay)) {
            trace.rpcRetryDelayMs = Number(retryDelay.slice(0, -1)) * 1000;
        }
    } catch {
        // Provider messages can contain sensitive values; only structured allowlisted fields are recorded.
    }
    trace.stage = "provider_error";
}

let stage = "configuration";

function requireCheck(condition, code) {
    if (!condition) throw Object.assign(new Error(), { smokeCode: code });
}

async function run() {
    if (!process.env.GEMINI_API_KEY?.trim()) {
        console.error("GEMINI_API_KEY is not configured.");
        process.exitCode = 1;
        return;
    }

    stage = "isolated_database";
    const { PGlite } = require("@electric-sql/pglite");
    const { PGLiteSocketServer } = require("@electric-sql/pglite-socket");
    const { Pool } = require("pg");
    const { processNextDocumentJob, processNextQueryJob } = require("../jobRunner");
    const { processQueryJob } = require("../index");
    const { getGeminiClient } = require("../geminiService");

    const engine = await PGlite.create();
    const server = new PGLiteSocketServer({ db: engine, host: "127.0.0.1", port: 0 });
    let db;
    try {
        const schema = await readFile(path.join(__dirname, "../../backend/schema.sql"), "utf8");
        await engine.exec(schema);
        await server.start();
        db = new Pool({
            connectionString: `postgres://postgres@${server.getServerConn()}/postgres`,
            password: "",
            ssl: false,
            max: 1,
            connectionTimeoutMillis: 5000
        });

        const { rows: [user] } = await db.query(
            "INSERT INTO users (name, email, hashed_password) VALUES ('Smoke test', 'smoke@example.test', 'unused') RETURNING id"
        );
        const { rows: [workspace] } = await db.query(
            "INSERT INTO workspaces (name) VALUES ('Synthetic smoke test') RETURNING id"
        );
        const bytes = Buffer.from(
            "The following classroom project is fictional. The designated launch color is cobalt."
        );
        const { rows: [file] } = await db.query(
            `INSERT INTO files (workspace_id, uploaded_by, name, media_type, size, content)
             VALUES ($1, $2, 'smoke-fixture.txt', 'text/plain', $3, $4) RETURNING id`,
            [workspace.id, user.id, bytes.length, bytes]
        );
        await db.query("INSERT INTO processing_jobs (file_id) VALUES ($1)", [file.id]);
        await processNextDocumentJob(db);
        const { rows: [document] } = await db.query(
            "SELECT status, extracted_text FROM processing_jobs WHERE file_id = $1", [file.id]
        );
        requireCheck(document.status === "completed" && document.extracted_text === bytes.toString(), "extraction");

        async function enqueue() {
            const { rows: [job] } = await db.query(
                `INSERT INTO query_jobs (workspace_id, requested_by, question, file_ids, file_names)
                 VALUES ($1, $2, $3, $4, ARRAY['smoke-fixture.txt']) RETURNING id`,
                [workspace.id, user.id, "What is the designated launch color? Answer with one word.", [file.id]]
            );
            return job.id;
        }
        async function readJob(id) {
            const { rows: [job] } = await db.query(
                "SELECT status, answer, error_message FROM query_jobs WHERE id = $1", [id]
            );
            return job;
        }

        stage = "real_gemini";
        const realJob = await enqueue();
        const sdkChunksValid = [];
        const receivedText = [];
        let model;
        const attempts = [];
        const longBackoff = process.argv.includes("--long-backoff");
        let realResult;
        await processNextQueryJob(db, async (documents, question) => {
            const client = {
                models: {
                    async *generateContentStream(request) {
                        if (/^gemini-[a-z0-9.-]+$/i.test(request.model) &&
                            !request.model.includes(process.env.GEMINI_API_KEY)) {
                            model = request.model;
                        }
                        const started = performance.now();
                        const elapsed = () => Math.round(performance.now() - started);
                        const trace = { attempt: attempts.length + 1, stage: "waiting_for_iterator" };
                        attempts.push(trace);
                        const signal = request.config.abortSignal;
                        signal.addEventListener("abort", () => {
                            if (signal.reason?.code === "timeout") {
                                trace.stageAtTimeout = trace.stage;
                                trace.stage = "timeout";
                                trace.elapsedMs = elapsed();
                            }
                        }, { once: true });
                        try {
                            const stream = await getGeminiClient().models.generateContentStream(request);
                            trace.iteratorMs = elapsed();
                            trace.stage = "waiting_for_stream_event";
                            for await (const chunk of stream) {
                                trace.firstEventMs ??= elapsed();
                                trace.stage = "reading_stream";
                                const text = chunk.text;
                                if (typeof text === "string" && text.trim()) trace.firstTextMs ??= elapsed();
                                sdkChunksValid.push(typeof text === "string" && text.trim().length > 0);
                                yield chunk;
                            }
                            trace.stage = "stream_ended";
                        } catch (error) {
                            if (trace.stage !== "timeout") recordProviderError(trace, error);
                            throw error;
                        } finally {
                            trace.elapsedMs ??= elapsed();
                    }
                    }
                }
            };
            realResult = await processQueryJob(documents, question, text => receivedText.push(text), {
                client,
                async sleep(delay) {
                    const trace = attempts.at(-1);
                    trace.plannedBackoffMs = Math.round(delay);
                    const minimum = longBackoff ? 10000 * trace.attempt : 0;
                    const selected = Math.max(delay, minimum);
                    trace.selectedBackoffMs = Math.round(selected);
                    const started = performance.now();
                    await sleep(selected);
                    trace.actualBackoffMs = Math.round(performance.now() - started);
                }
            });
            return realResult;
        });

        const stored = await readJob(realJob);
        const fullAnswer = receivedText.join("");
        const apiSucceeded = realResult?.status === "completed";
        const verifiedWrite = stored.status === "completed" && stored.error_message === null &&
            fullAnswer.trim().length > 0 && realResult?.answer === fullAnswer && stored.answer === fullAnswer;
        const answerGrounded = /\bcobalt\b/i.test(fullAnswer);
        console.log(JSON.stringify({
            test: "real_gemini", model, longBackoff, apiSucceeded, attempts,
            errorCategory: realResult?.errorCategory,
            textChunkCount: receivedText.length,
            validTextByStreamChunk: sdkChunksValid,
            databaseStatus: stored.status, answerMatches: verifiedWrite, answerGrounded
        }));
        if (!apiSucceeded || !verifiedWrite || !answerGrounded) process.exitCode = 1;

        stage = "mock_failure";
        const failedJob = await enqueue();
        // A successful value from a prior attempt must be cleared on failure.
        await db.query("UPDATE query_jobs SET answer = 'stale test answer' WHERE id = $1", [failedJob]);
        let failedResult;
        let mockCalls = 0;
        const client = { models: {
            async generateContentStream() {
                mockCalls++;
                throw Object.assign(new Error("Synthetic Gemini failure"), { status: 403 });
            }
        } };
        await processNextQueryJob(db, async (documents, question) => {
            failedResult = await processQueryJob(documents, question, undefined, { client });
            return failedResult;
        });
        const failed = await readJob(failedJob);
        const failureSaved = failed.status === "failed" && failed.answer === null && mockCalls === 1 &&
            failedResult?.errorCategory === "authentication" &&
            typeof failed.error_message === "string" && failed.error_message.length > 0 &&
            failed.error_message === failedResult.error;
        console.log(JSON.stringify({
            test: "mock_failure", passed: failureSaved, mockCalls,
            databaseStatus: failed.status, answerCleared: failed.answer === null,
            errorSaved: Boolean(failed.error_message)
        }));
        if (!failureSaved) process.exitCode = 1;
    } finally {
        await db?.end();
        await server.stop();
        await engine.close();
    }
}

run().catch(error => {
    // Report only fixed stage names and locally defined assertion identifiers.
    console.error(JSON.stringify({ stage, failed: true, check: error.smokeCode }));
    process.exitCode = 1;
});
