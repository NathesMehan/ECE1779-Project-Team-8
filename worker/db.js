const { Pool } = require("pg");
require("dotenv").config({ quiet: true });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
});

module.exports = pool;
