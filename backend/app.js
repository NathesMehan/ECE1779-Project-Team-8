// const declares a variable that cannot be reassigned
// express provides the web server and routing tools
// require(...) loads a package 
// { Pool } provides reusable postgresql connections
// { createClient } creates redis client 
// multer reads uploaded files
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { randomBytes, createHash } = require('node:crypto');
const multer = require('multer');

// app is the express application to which middleware and routes are attached
// port is where application will recieve HTTP requests
const app = express();
const api = express.Router();
const port = Number(process.env.PORT ?? 3000);

// Middleware to parse JSON bodies
app.use(express.json());

// Create a connection pool using configuration from .env file (hostname, port, username, etc.)
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const upload = multer({
    // Temporarily holds an uploaded file in backend memory
    storage: multer.memoryStorage(),
    limits: {
        // File size < 10 MB
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
});

async function requireAuth(req, res, next) {
    const authorization = req.get("Authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Sign in to continue." });
    }

    // Hash the token to match the stored hashed_token in the database
    // .slice(7) removes the "Bearer " prefix from Authorization header
    // sha256 produces a long randomly generated token
    const token = authorization.slice(7);
    const hashed_token = createHash("sha256").update(token).digest("hex");

    try {
        const { rows: [user] } = await pool.query(
            `SELECT u.id, u.name, u.email FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.hashed_token = $1 AND s.expires_at > now()`,
            [hashed_token]
        );

        if (!user) {
            return res.status(401).json({ error: "Session invalid or expired. Sign in to continue." });
        }

        req.user = user;
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not verify session." });
    }

    next();
}

//THINGS TO BUILD
// 1. GET /health: Basic health check
app.get("/health", (req, res) => {
    return res.status(200).json({ status: "ok" });
});

// 2. GET /health/db: Check database connectivity
app.get("/health/db", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        return res.status(200).json({ status: "ok" });

    } catch (err) {
        console.error(err);
        return res.status(503).json({ status: "error", message: "Service Unavailable" });
    }
});

// 3. GET /workspaces: Retrieve workspaces for the authenticated user
api.get("/workspaces", requireAuth, async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Sign in to continue." });
    }

    try { 
        const { rows } = await pool.query(
            `SELECT w.id, w.name, w.description, m.role, w.created_at AS "createdAt" 
            FROM workspaces w JOIN workspace_members m ON m.workspace_id = w.id 
            WHERE m.user_id = $1 
            ORDER BY w.created_at DESC`,
            [userId]
        );
        return res.status(200).json(rows);
    
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not load workspace." });
    }
});

app.use("/api", api);

// 4. POST /workspaces: Create a new workspace and make signed-in user the owner
api.post("/workspaces", requireAuth, async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Sign in to continue." });
    }

    const { name, description = "" } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim() || typeof description !== 'string') {
        return res.status(400).json({ error: "Enter a valid workspace name and description." });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Returns the first row from psql and names it membership
        const { rows: [workspace] } = await client.query(
            `INSERT INTO workspaces (name, description) VALUES ($1, $2) 
            RETURNING id, name, description, created_at AS "createdAt"`,
            [name.trim(), description.trim()]
        );

        await client.query(
            `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, "owner")`,
            [workspace.id, userId]
        );

        await client.query("COMMIT");
        return res.status(201).json({ 
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            createdAt: workspace.createdAt,
            role: "owner"
        });

    } catch (err) {
        if (client) {
            try {
                await client.query("ROLLBACK");

            } catch (rollbackErr) {
                client.release(rollbackErr);
                client = undefined;
            }
        }
        console.error(err);
        return res.status(500).json({ error: "Could not create workspace." });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// 5. POST /auth/register: Register a new user
api.post("/auth/register", async (req, res) => {
    const { name, email, password } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "Name is required." });
    }

    // !/^[^\s@]+@[^\s@]+\.[^\s@]+$/ is a regex pattern that ensure email follows something@something.something format
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: "Enter a valid email." });
    }

    // bcrypt limits password length to 72 bytes
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
        return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const { rows: [user] } = await pool.query(
            `INSERT INTO users (name, email, hashed_password) VALUES ($1, $2, $3) 
            ON CONFLICT (email) DO NOTHING RETURNING id, name, email`,
            [name.trim(), email.trim().toLowerCase(), hashedPassword]
        );

        if (!user) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }
        return res.status(201).json(user);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not register account." });
    }
});

// 6. POST /auth/login: Authenticate user by checking that credentials match
api.post("/auth/login", async (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password || Buffer.byteLength(password, "utf8") > 72) {
        return res.status(400).json({ error: "Enter a valid email and password." });
    }

    try {
        const { rows: [user] } = await pool.query(
            `SELECT id, name, email, hashed_password FROM users WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        if (!user || !(await bcrypt.compare(password, user.hashed_password))) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const token = randomBytes(32).toString("hex");

        const tokenHash = createHash("sha256").update(token).digest("hex");

        await pool.query(
            `INSERT INTO sessions (hashed_token, user_id, expires_at) 
            VALUES ($1, $2, now() + interval "1 day")`,
            [tokenHash, user.id]
        )

        return res.status(200).json({ 
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not log in." });
    }
});

// 7. GET /workspaces/files: List files in a given workspace
api.get("/workspaces/:workspaceId/files", requireAuth, async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;

    try{
        const { rows: [membership] } = await pool.query(
            `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspaceId, userId]
        );

        if (!membership) {
            return res.status(404).json({ error: "Workspace not found." });
        }

        const { rows } = await pool.query(
            `SELECT id, workspace_id AS "workspaceId", 
                name, media_type AS type, size, 
                uploaded_at AS "uploadedAt"
            FROM files WHERE workspace_id = $1 ORDER BY uploaded_at DESC`,
            [workspaceId]
        );

        return res.status(200).json(rows);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not load files." });
    }
});

// 8. POST /workspaces/files: Upload a file and its metadata and and store it in the database; create a processing job for the background worker
api.post("/workspaces/:workspaceId/files", requireAuth, upload.single("file"), async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;
    let client;

    try{
        const { rows: [membership] } = await pool.query(
            `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspaceId, userId]
        );

        if (!membership) {
            return res.status(404).json({ error: "Workspace not found." });
        }

        if (!req.file || req.file.size === 0) {
            return res.status(400).json({ error: "File not found." });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const { rows: [file] } = await client.query(
            `INSERT INTO files (workspace_id, uploaded_by, name, media_type, size, content) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, workspace_id AS "workspaceId", 
                name, media_type AS type, size, 
                uploaded_at AS "uploadedAt"`,
            [workspaceId, userId, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer]
        );

        const { rows: [job] } = await client.query(
            `INSERT INTO processing_jobs (file_id) VALUES ($1) RETURNING id, status`,
            [file.id]
        );

        await client.query("COMMIT");

        file.processingJobId = job.id;
        file.status = job.status;

        return res.status(201).json(file);

    } catch (err) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                client.release(rollbackError);
                client = undefined;
            }
        }

        console.error(err);
        return res.status(500).json({ error: "Could not upload file." });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// 9. GET /workspaces/files/download: Download a file 
api.get("/workspaces/:workspaceId/files/:fileId/download", requireAuth, async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;
    const fileId = req.params.fileId;

    try {
        const { rows: [membership] } = await pool.query(
            `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspaceId, userId]
        )

        if (!membership) {
            return res.status(404).json({ error: "Workspace not found." })
        }

        const { rows: [file] } = await pool.query(
            `SELECT name, content FROM files WHERE id = $1 AND workspace_id = $2`,
            [fileId, workspaceId]
        );

        if (!file) {
            return res.status(404).json({ error: "File not found." });
        }

        // Tells browser this is a download and supplied filename
        res.attachment(file.name);
        // Identifies response as binary data
        res.type("application/octet-stream");

        // Sends actual file bytes rather than JSON
        return res.send(file.content);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not download file. "});
    }
});

// 10. DELETE /files/:id: Delete a file and its associated data from the database
api.delete("/workspaces/:workspaceId/files/:fileId", requireAuth, async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;
    const fileId = req.params.fileId;

    try {
        const { rows: [membership] } = await pool.query(
            `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspaceId, userId]
        );

        if (!membership) {
            return res.status(404).json({ error: "Workspace not found." })
        };

        const { rows: [file] } = await pool.query(
            `DELETE FROM files WHERE id = $1 AND workspace_id = $2 RETURNING id`,
            [fileId, workspaceId]
        );

        if (!file) {
            return res.status(404).json({ error: "File not found." });
        }

        return res.status(204).send();

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not delete file. "});
    }
});

// 11. GET /workspaces/jobs: Check the status of the processing job
api.get("/workspaces/:workspaceId/jobs/:jobId", requireAuth, async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;
    const jobId = req.params.jobId;

    try{
        const { rows: [job] } = await pool.query(
            `SELECT j.id, j.file_id AS "fileId", 
                f.workspace_id AS "workspaceId",
                j.status,
                j.created_at AS "createdAt",
                j.updated_at AS "updatedAt"
            FROM processing_jobs j JOIN files f ON f.id = j.file_id JOIN workspace_members m ON m.workspace_id = f.workspace_id
            WHERE j.id = $1 AND f.workspace_id = $2 AND m.user_id = $3`,
            [jobId, workspaceId, userId]
        );

        if (!job) {
            return res.status(404).json({ error: "Job not found." });
        }

        return res.status(200).json(job);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not load processing job." });
    }
});

// Context for Annie:
// -> documentIds from the frontend (made by Sid) correspond to files.id  in the backend and are stored as file_ids
// -> This endpoint below, saves a pending LLM request from the user in query_jobs
// -> The background worker you build should:
//      -> Take the users question and the files they selected for context
//      -> Generate an answer and save that answer in the same query_jobs row
// -> The API does NOT call Gemini or OpenAI, you must write the code to recieve a processing job and call the LLM
// -> Authenticated GET endpoints (above in this code file) expose stored job status, answers, and history to members of the workspace

// 12. POST /workspaces/queries: Ask a question to the LLM
api.post("/workspaces/:workspaceId/queries", requireAuth, async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;
    const { question, documentIds } = req.body ?? {};

    if (typeof question !== "string" || !question.trim() || question.trim().length > 5000) {
        return res.status(400).json({ error: "Enter a question up to 5000 characters long." });
    }
    
    if (!Array.isArray(documentIds) || documentIds.length < 1 || documentIds.length > 10 || documentIds.some(id => typeof id !== "string")) {
        return res.status(400).json({ error: "Select between 1 and 10 context files." });
    }

    try{
        const { rows: [membership] } = await pool.query(
            `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspaceId, userId]
        );

        if (!membership) {
            return res.status(404).json({ error: "Workspace not found." })
        };

        // Returns entire rows array as selectedFiles
        // ANY($2::uuid[]) matches a file against any ID in the supplied array
        const { rows: selectedFiles } = await pool.query(
            `SELECT f.id, f.name 
            FROM files f JOIN processing_jobs j ON j.file_id = f.id
            WHERE f.workspace_id = $1 
            AND f.id = ANY($2::uuid[]) 
            AND j.status = 'completed'
            AND j.extracted_text IS NOT NULL
            ORDER BY f.id`,
            [workspaceId, documentIds]
        );

        if (selectedFiles.length !== documentIds.length) {
            return res.status(400).json({ error: "Select distinct files from the workspace that have completed content extraction." });
        }

        // .map(file => file.X) builds an array containing just the IDs from the selected rows
        const fileIds = selectedFiles.map(file => file.id);
        const fileNames = selectedFiles.map(file => file.name);

        const { rows: [job] } = await pool.query(
            `INSERT INTO query_jobs (workspace_id, requested_by, question, file_ids, file_names)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, workspace_id AS "workspaceId",
                question, file_ids AS "documentIds",
                file_names AS "documentNames",
                status, answer, created_at AS "createdAt"`,
            [workspaceId, userId, question.trim(), fileIds, fileNames]
        );

        // stats(202) means the request was queued, but the answer is not yet ready
        return res.status(202).json(job);

    } catch (err) {
        if (err.code === "22P02") {
            return res.status(400).json({ error: "Invalid workspace or file ID." });
        }

        console.error(err);
        return res.status(500).json({ error: "Could not submit question." });
    }
});

// 13. GET /workspaces/queries: Retrieve a question and answer from psql database
api.get('/workspaces/:workspaceId/queries/:queryId', requireAuth, async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;
    const queryId = req.params.queryId;

    try {
        const { rows: [job] } = await pool.query(
            `SELECT q.id, q.workspace_id AS "workspaceId",
                q.question,
                q.file_ids AS "documentIds",
                q.file_names AS "documentNames",
                q.status, q.answer,
                q.created_at AS "createdAt",
                q.updated_at AS "updatedAt"
            FROM query_jobs q 
            JOIN workspace_members m ON m.workspace_id = q.workspace_id
            WHERE q.id = $1 AND q.workspace_id = $2 AND m.user_id = $3`,
            [queryId, workspaceId, userId]
        );

        if (!job) {
            return res.status(404).json({ error: "Question not found." });
        }

        return res.status(200).json(job);

    } catch (err) {
        if (err.code === "22P02") {
            return res.status(400).json({ error: "Invalid workspace ID." });
        }

        console.error(err);
        return res.status(500).json({ error: "Could not load question." });
    }
});

// 14. GET /workspaces/queries: Retrieve question history
api.get("/workspaces/:workspaceId/queries", requireAuth, async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;

    try {
        const { rows: [membership] } = await pool.query(
            `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspaceId, userId]
        );

        if (!membership) {
            return res.status(404).json({ error: "Workspace not found." })
        };

        const { rows } = await pool.query(
            `SELECT id, workspace_id AS "workspaceId",
                question,
                file_ids AS "documentIds",
                file_names AS "documentNames",
                status, answer,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            FROM query_jobs WHERE workspace_id = $1
            ORDER BY created_at ASC, id ASC`,
            [workspaceId]
        );

        return res.status(200).json(rows);

    } catch (err) {
        if (err.code === "22P02") {
            return res.status(400).json({ error: "Invalid workspace ID." });
        }

        console.error(err);
        return res.status(500).json({ error: "Could not load question." });
    }
});


app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const tooLarge = err.code === "LIMIT_FILE_SIZE";

        return res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? "File exceeds 10 MB limit." : "Upload one file using the field named file."})
    }

    next(err);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});