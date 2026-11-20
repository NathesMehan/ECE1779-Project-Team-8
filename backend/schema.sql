-- Create psql db to store files, metadata, extracted text, AI responses, and user permissions
-- Initial schema for a fresh db:

-- uuid = universally unique identifier
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    hashed_password text NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'member')),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    hashed_token text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
);

-- Context for Annie: 
-- -> This table stores uploaded files and their metadata
-- -> The content contains the original file bytes as bytea
-- -> workspace_id identifies the workspace; uploaded_by identifies the person who uploaded the file

-- File size < 10 MB
-- bytea store binary data
CREATE TABLE IF NOT EXISTS files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    uploaded_by uuid NOT NULL REFERENCES users(id),
    name text NOT NULL,
    media_type text NOT NULL,
    size int NOT NULL CHECK (size BETWEEN 1 AND 10485760),
    content bytea NOT NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- More Context for Annie: 
-- -> The upload API creates one pending extraction job per file (the job for the processing worker to pull text from the file for the LLM)
-- -> file_id references files.id
-- -> This table provides fields for status, extracted_text, error_message
-- -> Deleting a file automatically deletes its extraction job 
-- -> updated_at defaults to creation time. It does NOT update automatically

CREATE TABLE IF NOT EXISTS processing_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id uuid NOT NULL UNIQUE REFERENCES files(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_text text,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Even More Context for Annie: 
-- -> This table stores submitted questions and the file IDs for the files the user wants as context for the LLM
-- -> The API checks workspace membership and if the text has been extracted from the files before inserting into this table
-- -> New jobs always begin as "pending", and thus the answer field starts as null
-- -> requested_by identifies the user who sent the question
-- -> file_ids is an array containing the ids of all context files

CREATE TABLE IF NOT EXISTS query_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    requested_by uuid NOT NULL REFERENCES users(id),
    question text NOT NULL,
    file_ids uuid[] NOT NULL,
    file_names text[] NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    answer text,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);