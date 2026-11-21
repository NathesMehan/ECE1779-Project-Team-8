const { setTimeout: sleep } = require("node:timers/promises");
const pool = require("./db");
const { processNextDocumentJob, processNextQueryJob, recoverStaleJobs } = require("./jobRunner");

async function startWorker() {
    const shutdown = new AbortController();
    const stop = () => shutdown.abort();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const reportPoolError = () => console.error("Database pool connection failed.");
    pool.on("error", reportPoolError);

    let nextRecovery = 0;
    let queueState = "starting";
    console.info("Background worker started.");
    try {
        while (!shutdown.signal.aborted) {
            if (Date.now() >= nextRecovery) {
                nextRecovery = Date.now() + 60000;
                try {
                    await recoverStaleJobs();
                } catch {
                    console.error("Stale job recovery failed.");
                }
            }

            let successfulChecks = 0;
            let claimedJob = false;
            for (const [queue, run] of [
                ["processing_jobs", processNextDocumentJob],
                ["query_jobs", processNextQueryJob]
            ]) {
                if (shutdown.signal.aborted) break;
                try {
                    const claimed = await run();
                    claimedJob ||= claimed;
                    successfulChecks++;
                } catch {
                    console.error("Queue iteration failed", { queue });
                }
            }

            if (!shutdown.signal.aborted) {
                if (successfulChecks !== 2) {
                    queueState = "unavailable";
                } else {
                    if (queueState === "starting" || queueState === "unavailable") {
                        console.info("PostgreSQL connection and both queue checks succeeded.");
                    }
                    if (!claimedJob && queueState !== "idle") {
                        console.info("Worker idle: no claimable jobs in either queue. Checking again in 5 seconds.");
                    }
                    queueState = claimedJob ? "active" : "idle";
                }
            }

            try {
                await sleep(5000, undefined, { signal: shutdown.signal });
            } catch (error) {
                if (error.name !== "AbortError") throw error;
            }
        }
    } finally {
        await pool.end();
        pool.off("error", reportPoolError);
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
    }
}

if (require.main === module) {
    startWorker().catch(() => {
        console.error("Background worker stopped unexpectedly.");
        process.exitCode = 1;
    });
}

module.exports = { startWorker };
