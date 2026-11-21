const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createHash, randomUUID } = require("node:crypto");
const { once } = require("node:events");
const { readFile } = require("node:fs/promises");
const net = require("node:net");
const path = require("node:path");
const test = require("node:test");
const { setTimeout: sleep } = require("node:timers/promises");
const { Pool } = require("pg");
const { supported, invalid } = require("./fixtures");

const backendDir = process.env.WORKER_TEST_BACKEND_DIR;
const databaseUrl = process.env.WORKER_TEST_DATABASE_URL;
const schemaFile = path.join(__dirname, "../../backend/schema.sql");

async function waitFor(check) {
    for (let attempt = 0; attempt < 100; attempt++) {
        if (await check()) return;
        await sleep(100);
    }
    assert.fail("Service did not reach the expected state");
}

async function freePort() {
    const server = net.createServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address();
    await new Promise(resolve => server.close(resolve));
    return port;
}

function startChild(t, args, env, onStdout) {
    // The exported Backend directory is isolated from the project's dotenv files.
    const child = spawn(process.execPath, args, {
        cwd: backendDir, env: { PATH: process.env.PATH, ...env }, stdio: ["ignore", "pipe", "pipe"]
    });
    if (onStdout) child.stdout.setEncoding("utf8").on("data", onStdout);
    else child.stdout.resume();
    child.stderr.resume();
    t.after(async () => {
        if (child.exitCode == null && child.signalCode == null) {
            const exited = once(child, "exit");
            child.kill("SIGKILL");
            await exited;
        }
    });
    return child;
}

test("Backend REST and PostgreSQL with synthetic documents and mock Gemini", {
    skip: !backendDir || !databaseUrl,
    timeout: 60000
}, async t => {
    // Avoid loading repo-local dotenv files when constructing the default pool.
    const previousCwd = process.cwd();
    let runners;
    try {
        process.chdir(backendDir);
        runners = require("../jobRunner");
    } finally {
        process.chdir(previousCwd);
    }
    const { processNextDocumentJob, processNextQueryJob, recoverStaleJobs } = runners;
    const { processQueryJob } = require("../index");
    const db = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
    t.after(() => db.end());
    const { rows: [preflight] } = await db.query(`
        SELECT current_database() AS name,
               EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public') AS has_tables
    `);
    assert.match(preflight.name, /^worker_test_/);
    assert.equal(preflight.has_tables, false, "Use an empty, disposable PostgreSQL database");
    await db.query(await readFile(schemaFile, "utf8"));

    const url = new URL(databaseUrl);
    const env = {
        DB_HOST: url.hostname, DB_PORT: url.port || "5432", DB_USER: decodeURIComponent(url.username),
        DB_PASSWORD: decodeURIComponent(url.password), DB_NAME: url.pathname.slice(1)
    };
    const port = await freePort();
    const backend = startChild(t, [path.join(backendDir, "app.js")], { ...env, PORT: String(port) });
    const base = `http://127.0.0.1:${port}`;
    await waitFor(async () => {
        assert.equal(backend.exitCode, null, "Backend exited during startup");
        return fetch(base + "/health/db").then(response => response.ok, () => false);
    });

    // Seed identity and membership while the Backend login and workspace SQL are being fixed.
    const { rows: [user] } = await db.query(
        "INSERT INTO users (name, email, hashed_password) VALUES ($1, $2, $3) RETURNING id",
        ["Worker QA", "worker@example.test", "unused-test-hash"]
    );
    const token = randomUUID();
    await db.query(
        "INSERT INTO sessions (hashed_token, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
        [createHash("sha256").update(token).digest("hex"), user.id]
    );
    async function api(route, expected = 200, body, method = body ? "POST" : "GET") {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        if (body && !(body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(body);
        }
        const response = await fetch(base + "/api" + route, { method, headers, body });
        assert.equal(response.status, expected, `${method} ${route}`);
        return response.status === 204 ? undefined : response.json();
    }

    async function createWorkspace(name) {
        const { rows: [workspace] } = await db.query(
            "INSERT INTO workspaces (name) VALUES ($1) RETURNING id", [name]
        );
        await db.query(
            "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
            [workspace.id, user.id]
        );
        return workspace;
    }
    const workspace = await createWorkspace("Worker fixtures");
    const workspacePath = `/workspaces/${workspace.id}`;
    async function upload([name, bytes], route = workspacePath) {
        const form = new FormData();
        form.append("file", new Blob([bytes]), name);
        return api(route + "/files", 201, form);
    }

    const files = [];
    for (const fixture of [...supported, ...invalid]) files.push(await upload(fixture));
    assert.ok(files.every(file => file.status === "pending" && file.processingJobId));
    for (let index = 0; index < files.length; index += 2) {
        await Promise.all([processNextDocumentJob(db), processNextDocumentJob(db)]);
    }
    for (const [index, file] of files.entries()) {
        const job = await api(workspacePath + "/jobs/" + file.processingJobId);
        const { rows: [stored] } = await db.query("SELECT extracted_text, error_message FROM processing_jobs WHERE id = $1", [job.id]);
        if (index < supported.length) {
            assert.equal(job.status, "completed");
            assert.match(stored.extracted_text, /context marker/);
        } else {
            assert.equal(job.status, "failed");
            assert.equal(stored.extracted_text, null);
            assert.ok(stored.error_message);
        }
    }

    const question = "What is the marker?";
    const queries = workspacePath + "/queries";
    const submit = (...documentIds) => api(queries, 202, { question, documentIds });
    const query = await submit(files[2].id, files[0].id);
    const single = await submit(files[1].id);
    const contextInputs = [];
    let unblock;
    const gate = new Promise(resolve => { unblock = resolve; });
    async function runMock(documents, prompt) {
        contextInputs.push(documents.map(doc => doc.name));
        await gate;
        return processQueryJob(documents, prompt, undefined, {
            client: { models: {
                async *generateContentStream() {
                    yield { text: "context " };
                    yield { text: "marker", candidates: [{ finishReason: "STOP" }] };
                }
            } }
        });
    }
    const polling = Promise.all([processNextQueryJob(db, runMock), processNextQueryJob(db, runMock)]);
    try {
        await waitFor(() => contextInputs.length === 2);
        assert.equal((await api(queries + "/" + query.id)).status, "processing");
        assert.equal((await api(queries + "/" + single.id)).status, "processing");
        await processNextQueryJob(db, () => assert.fail("A third worker claimed an active job"));
    } finally {
        unblock();
        await polling;
    }
    assert.ok(contextInputs.some(names => names.length === 1 && names[0] === files[1].name));
    const expectedNames = query.documentIds.map(id => files.find(file => file.id === id).name);
    assert.deepEqual(contextInputs.find(names => names.length === 2), expectedNames);
    assert.equal((await api(queries + "/" + query.id)).answer, "context marker");
    assert.equal((await api(queries + "/" + single.id)).status, "completed");
    assert.equal((await api(queries)).length, 2);

    const removed = await submit(files[0].id);
    await db.query("DELETE FROM files WHERE id = $1", [files[0].id]);
    await processNextQueryJob(db, () => assert.fail("Deleted content was sent to Gemini"));
    const removedResult = await api(queries + "/" + removed.id);
    assert.equal(removedResult.status, "failed");
    assert.equal(removedResult.answer, null);

    const otherWorkspace = await createWorkspace("Other workspace");
    const otherFile = await upload(supported[2], `/workspaces/${otherWorkspace.id}`);
    await processNextDocumentJob(db);
    await api(queries, 400, { question, documentIds: [otherFile.id] });
    const crossWorkspace = await submit(files[1].id);
    await db.query("UPDATE query_jobs SET file_ids = $2 WHERE id = $1", [crossWorkspace.id, [otherFile.id]]);
    await processNextQueryJob(db, () => assert.fail("Cross-workspace content was sent to Gemini"));
    assert.equal((await api(queries + "/" + crossWorkspace.id)).status, "failed");

    const staleDoc = await upload(supported[2]);
    await assert.rejects(processNextDocumentJob({
        connect: () => db.connect(),
        query: async () => { throw new Error("simulated failed final write"); }
    }), /simulated failed final write/);
    assert.equal((await api(workspacePath + "/jobs/" + staleDoc.processingJobId)).status, "processing");
    await db.query("UPDATE processing_jobs SET updated_at = now() - interval '16 minutes' WHERE id = $1", [staleDoc.processingJobId]);
    await recoverStaleJobs(db);
    assert.equal((await api(workspacePath + "/jobs/" + staleDoc.processingJobId)).status, "failed");

    const deletedDuringProcessing = await upload(supported[2]);
    await processNextDocumentJob({
        connect: () => db.connect(),
        async query(...args) {
            await db.query("DELETE FROM files WHERE id = $1", [deletedDuringProcessing.id]);
            return db.query(...args);
        }
    });
    await api(workspacePath + "/jobs/" + deletedDuringProcessing.processingJobId, 404);

    const staleQuery = await submit(files[1].id);
    await processNextQueryJob(db, async () => {
        await db.query("UPDATE query_jobs SET updated_at = now() - interval '16 minutes' WHERE id = $1", [staleQuery.id]);
        await recoverStaleJobs(db);
        return { status: "completed", answer: "outdated answer" };
    });
    const recovered = await api(queries + "/" + staleQuery.id);
    assert.equal(recovered.status, "failed");
    assert.equal(recovered.answer, null);

    const abandoned = await submit(files[1].id);
    const runnerPath = path.join(__dirname, "../jobRunner.js");
    const crashingWorker = startChild(t, ["-e", `
        const { processNextQueryJob } = require(${JSON.stringify(runnerPath)});
        processNextQueryJob(undefined, () => process.kill(process.pid, "SIGKILL"));
    `], env);
    assert.deepEqual(await once(crashingWorker, "exit"), [null, "SIGKILL"]);
    assert.equal((await api(queries + "/" + abandoned.id)).status, "processing");
    await db.query("UPDATE query_jobs SET updated_at = now() - interval '16 minutes' WHERE id = $1", [abandoned.id]);

    // Start the real loop with both queues pending and no Gemini key.
    const pendingDocument = await upload(supported[2]);
    const pendingQuery = await submit(files[1].id);
    let workerOutput = "";
    const worker = startChild(t, [path.join(__dirname, "../worker.js")], env, chunk => {
        workerOutput += chunk;
    });
    await waitFor(async () => {
        assert.equal(worker.exitCode, null, "Worker exited during startup");
        const pending = await api(queries + "/" + pendingQuery.id);
        return pending.status === "failed";
    });
    assert.equal((await api(workspacePath + "/jobs/" + pendingDocument.processingJobId)).status, "completed");
    assert.equal((await api(queries + "/" + abandoned.id)).status, "failed");
    await waitFor(() => workerOutput.includes("Worker idle: no claimable jobs in either queue."));
    assert.match(workerOutput, /PostgreSQL connection and both queue checks succeeded/);
    const exited = once(worker, "exit");
    worker.kill("SIGTERM");
    assert.deepEqual(await exited, [0, null]);
});
