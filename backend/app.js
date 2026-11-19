// const declares a variable that cannot be reassigned
// express provides the web server and routing tools
// require(...) loads a package 
// { Pool } provides reusable postgresql connections
// { createClient } creates redis client 
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { randomBytes, createHash } = require('node:crypto');

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

async function requireAuth(req, res, next) {
    const authorization = req.get("Authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Sign in to continue." });
    }

    // Hash the token to match the stored hashed_token in the database
    // .slice(7) removes the "Bearer " prefix from Authorization header
    // sha256 produces a long randomly generated token
    const token = authorization.slice(7);
    const hashed_token = createHash('sha256').update(token).digest('hex');

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

    const { name, description = '' } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim() || typeof description !== 'string') {
        return res.status(400).json({ error: "Enter a valid workspace name and description." });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const { rows: [workspace] } = await client.query(
            `INSERT INTO workspaces (name, description) VALUES ($1, $2) 
            RETURNING id, name, description, created_at AS "createdAt"`,
            [name.trim(), description.trim()]
        );

        await client.query(
            `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
            [workspace.id, userId]
        );

        await client.query('COMMIT');
        return res.status(201).json({ 
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            createdAt: workspace.createdAt,
            role: 'owner'
        });

    } catch (err) {
        if (client) {
            try {
                await client.query('ROLLBACK');

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
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
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

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
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

        const token = randomBytes(32).toString('hex');

        const tokenHash = createHash('sha256').update(token).digest('hex');

        await pool.query(
            `INSERT INTO sessions (hashed_token, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')`,
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
    const userId = req.user.Id;

    try{
        const { rows: [membership] } = await pool.query(
            `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspaceId, userId]
        );

        if (!membership) {
            return res.status(404).json({ error: "Workspace not found." });
        }

        const { rows } = await pool.query(
            `SELECT id, workspace_id AS "workspaceId", name, media_type AS type, size, uploaded_at AS "uploadedat"
            FROM documents WHERE workspace_id = $1 ORDER BY uploaded_at DESC`
            [workspaceId]
        );

        return res.status(200).json(rows);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not load documents." });
    }
});

// 5. POST /files: Upload a file and store it in the database
// 6. DELETE /files/:id: Delete a file and its associated data from the database
// 7. Create Processing Job: Trigger a background job to process the uploaded file (e.g., extract text, generate AI responses)



// Read the application port from the PORT environment variable
// Kubernetes injects this variable from a ConfigMap
// const port = Number(process.env.PORT);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});