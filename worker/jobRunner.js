const pool = require("./db");
const { processDocumentJob, processQueryJob } = require("./index");

const documentQueue = {
    table: "processing_jobs",
    resultColumn: "extracted_text",
    columns: "jobs.id, files.name AS file_name, files.content AS file_content",
    join: "JOIN files ON files.id = jobs.file_id",
    process: job => processDocumentJob(job.file_content, job.file_name)
};

const queryQueue = {
    table: "query_jobs",
    resultColumn: "answer",
    columns: "jobs.id, jobs.workspace_id, jobs.question, jobs.file_ids",
    join: "",
    process: async (job, db, runQuery) => {
        const { rows } = await db.query(
            `SELECT files.id, files.name, processing_jobs.extracted_text
             FROM unnest($2::uuid[]) WITH ORDINALITY AS selected(file_id, position)
             JOIN files ON files.id = selected.file_id AND files.workspace_id = $1
             JOIN processing_jobs ON processing_jobs.file_id = files.id
             WHERE processing_jobs.status = 'completed'
             ORDER BY selected.position`,
            [job.workspace_id, job.file_ids]
        );
        if (!rows.length || rows.length !== job.file_ids.length ||
            rows.some(row => !row.extracted_text?.trim())) {
            return {
                status: "failed",
                error: "One or more selected documents are missing or have no extracted text.",
                errorCategory: "missing_document"
            };
        }
        const documents = rows.map(row => ({ name: row.name, text: row.extracted_text }));
        return runQuery(documents, job.question);
    }
};

async function claimJob(db, queue) {
    const client = await db.connect();
    let connectionError;
    try {
        await client.query("BEGIN");
        const { rows: [job] } = await client.query(
            `SELECT ${queue.columns}
             FROM ${queue.table} AS jobs
             ${queue.join}
             WHERE jobs.status = 'pending'
             ORDER BY jobs.created_at, jobs.id
             LIMIT 1
             FOR UPDATE OF jobs SKIP LOCKED`
        );
        if (job) {
            const { rows: [claim] } = await client.query(
                `UPDATE ${queue.table}
                 SET status = 'processing', updated_at = clock_timestamp()
                 WHERE id = $1
                 RETURNING updated_at::text AS claimed_at`,
                [job.id]
            );
            // Preserve PostgreSQL microseconds for the ownership check.
            job.claimed_at = claim.claimed_at;
        }
        await client.query("COMMIT");
        return job;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            connectionError = rollbackError;
        }
        throw error;
    } finally {
        client.release(connectionError);
    }
}

async function processNextJob(db, queue, runQuery) {
    const job = await claimJob(db, queue);
    if (!job) return false;

    console.info("Job claimed", { queue: queue.table, jobId: job.id });
    const started = Date.now();
    let result;
    try {
        result = await queue.process(job, db, runQuery);
    } catch (error) {
        // A transient DB failure during context lookup should be handled by stale recovery.
        console.error("Job execution interrupted", {
            queue: queue.table, jobId: job.id, elapsedMs: Date.now() - started, category: "execution"
        });
        throw error;
    }

    try {
        const { rowCount } = await db.query(
            `UPDATE ${queue.table}
             SET status = $3, ${queue.resultColumn} = $4, error_message = $5, updated_at = clock_timestamp()
             WHERE id = $1 AND updated_at = $2::timestamptz AND status = 'processing'`,
            [job.id, job.claimed_at, result.status, result.text ?? result.answer ?? null, result.error ?? null]
        );
        console.info("Job finished", {
            queue: queue.table, jobId: job.id, elapsedMs: Date.now() - started,
            status: rowCount ? result.status : "claim_lost",
            category: result.errorCategory ?? (result.status === "failed" ? "extraction" : undefined)
        });
    } catch (error) {
        console.error("Job writeback failed", {
            queue: queue.table, jobId: job.id, elapsedMs: Date.now() - started, category: "database"
        });
        throw error;
    }
    return true;
}

async function recoverStaleJobs(db = pool) {
    for (const queue of [documentQueue, queryQueue]) {
        const { rows } = await db.query(
            `WITH stale AS (
                 SELECT id FROM ${queue.table}
                 WHERE status = 'processing' AND updated_at < now() - interval '15 minutes'
                 FOR UPDATE SKIP LOCKED
             )
             UPDATE ${queue.table} AS jobs
             SET status = 'failed', ${queue.resultColumn} = NULL,
                 error_message = 'The worker did not finish this job in time.', updated_at = clock_timestamp()
             FROM stale WHERE jobs.id = stale.id
             RETURNING jobs.id`
        );
        for (const job of rows) {
            console.warn("Job expired", { queue: queue.table, jobId: job.id, category: "stale" });
        }
    }
}

function processNextDocumentJob(db = pool) {
    return processNextJob(db, documentQueue);
}

function processNextQueryJob(db = pool, runQuery = processQueryJob) {
    return processNextJob(db, queryQueue, runQuery);
}

module.exports = { processNextDocumentJob, processNextQueryJob, recoverStaleJobs };
