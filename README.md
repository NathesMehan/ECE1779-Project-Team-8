# LLM Context Workspace
**ECE1779 — Introduction to Cloud Computing**  
**University of Toronto | Team 8**

## 1. Team Information
**Responsible: Sid**

| Name | Student Number | Email | Responsibility |
|---|---|---|---|
| Sidratul Muntaha | 1007249737 | [Email] | Frontend & Collaboration |
| Lucas Musselman | 1013988534 | [Email] | Backend API & Database |
| Nuo Cheng | 1013580643 | [Email] | LLM Integration & Background Processing |
| Nathes Mehanathan | 1007195394 | [Email] | Deployment, Infrastructure & Security |

## 2. Motivation & Objectives
**Responsible: Sid**

### 2.1 Motivation

Students, researchers, and project teams often manage documents, source code, and other materials across multiple platforms. When using large language models (LLMs), users must repeatedly provide relevant project information, making collaboration and maintaining context inefficient.

To address this challenge, we developed **LLM Context Workspace**, a cloud-based application that combines document management, shared workspaces, AI-assisted analysis, and activity tracking. By centralizing project materials and maintaining shared project context, the application aims to simplify collaboration and support research and software development workflows.

### 2.2 Project Objectives

The primary objectives of LLM Context Workspace are to:

1. **Centralize Project Materials:** Allow users to create workspaces and upload, organize, download, and delete project documents.

2. **Enable AI-Assisted Analysis:** Integrate an LLM to answer questions, summarize information, and analyze selected project documents.

3. **Support Collaboration:** Provide user accounts, shared workspaces, and role-based access controls for workspace members.

4. **Maintain Persistent History:** Preserve project documents, workspace information, activity records, and AI interactions across sessions and application restarts.

5. **Implement Cloud-Native Architecture:** Develop and deploy a containerized application using Docker, Docker Compose, PostgreSQL, persistent storage, Kubernetes, and DigitalOcean, with monitoring and additional security and real-time capabilities.

## 3. Technical Stack & Architecture
**Responsible: All members — each writes their assigned subsection.**

### 3.1 System Architecture
**Responsible: Nathes, with input from all members**

[Describe the final system architecture and how its components communicate.]

**Include:** System architecture diagram.

### 3.2 Frontend
**Responsible: Sid**

The frontend was developed using **React, TypeScript, and Vite**, providing a component-based architecture with efficient development and production builds. React Router manages navigation between authentication, dashboard, workspace, document, member management, AI chat, and activity pages. Reusable components, including the application layout, sidebar, and forms, maintain a consistent interface.

Authentication state is managed through React Context, while protected routes restrict access to authenticated application pages. A centralized REST API client handles HTTP communication, with Vite proxy configuration supporting backend requests during local development.

For deployment, the frontend uses a **multi-stage Dockerfile** that builds the React application using Node.js and serves the compiled static files through Nginx. Nginx also supports client-side routing and reverse-proxies API requests to the backend.

### 3.3 Backend API & Database
**Responsible: Lucas**

[Explain the backend architecture, REST endpoints, PostgreSQL schema, authentication/authorization, and state persistence.]

### 3.4 LLM Integration & Background Processing
**Responsible: Nuo**

[Explain document extraction, processing jobs, LLM API integration, response generation, and storage.]

### 3.5 Cloud Infrastructure & Deployment Architecture
**Responsible: Nathes**

[Explain Docker Compose, Kubernetes orchestration, DigitalOcean infrastructure, persistent volumes, monitoring, and networking.]

### 3.6 Advanced Features
**Responsible: Lucas, Nathes, and Sid**

[Describe and verify at least two implemented advanced features, such as real-time WebSocket functionality and security enhancements. Explain technical decisions and integration.]

**Evidence:** Relevant configuration, testing results, and monitoring screenshots.

## 4. Application Features
**Responsible: Sid, Lucas, and Nuo**

### 4.1 Authentication & Workspace Management
**Responsible: Sid + Lucas**

[Describe login, registration, workspace creation, workspace listing, and access management.]

The frontend provides login and registration interfaces with input validation, session restoration, and logout functionality. Protected routes prevent unauthenticated users from accessing application pages. Users can create workspaces, view existing workspaces on the dashboard, and navigate to individual workspace pages. 

### 4.2 Document Management
**Responsible: Sid + Lucas + Nuo**

[Describe file uploading, downloading, deleting, validation, storage, and processing status.]

The document management interface allows users to upload, download, and delete files within a workspace. Client-side validation enforces a maximum file size of **10 MB**, with feedback displayed for invalid uploads. Documents are presented with relevant information and processing statuses, allowing users to monitor their progress. 

### 4.3 Workspace Collaboration
**Responsible: Sid + Lucas**

[Describe member management, owner/member roles, permissions, and activity tracking.]

The frontend includes a member management interface that displays workspace members and their assigned roles. The interface supports owner and member roles, providing controls for managing workspace membership. An activity history page allows users to review workspace events and filter recorded activities. 

### 4.4 AI Chat & Document Queries
**Responsible: Sid + Nuo**

[Describe document selection, question submission, background processing, generated responses, and chat history.]

The AI chat interface allows users to select workspace documents, enter questions, and submit requests for processing. It displays processing statuses, generated response areas, and previous chat interactions. The interface was designed to accommodate asynchronous LLM processing and provide feedback throughout the query workflow. 

### 4.5 Testing & Verification
**Responsible: All members**

[Summarize actual testing methods, observed results, technical limitations, and evidence of end-to-end functionality.]

**Include:** A concise test-results table covering frontend, backend, database persistence, LLM processing, Kubernetes, monitoring, and advanced features.

## 5. User Guide
**Responsible: Sid**

### 5.1 Accessing the Application

Access the application at **[Deployment URL]**. New users can select **Create an account** to register, while existing users can sign in using their email address and password. After authentication, users are redirected to the application dashboard.

**[Screenshot: Login/Registration Page]**

### 5.2 Workspace Management

Navigate to **My Workspaces** using the sidebar and select **+ Create Workspace**. Enter a workspace name and description to create a new workspace. Existing workspaces are displayed as cards, which users can select to access workspace features.

**[Screenshot: Workspace Dashboard]**

### 5.3 Document Management

Open a workspace and navigate to **Documents**. Select **+ Upload Files** to upload one or more supported documents, with a maximum size of 10 MB per file. The document table displays filenames, sizes, upload dates, and processing statuses. Use the **Download** or **Delete** buttons to manage files.

**[Screenshot: Document Management Page]**

### 5.4 Members & Collaboration

Navigate to **Team Members** within a workspace to view members and their assigned roles. Workspace owners can select **+ Add Member**, enter a name and email address, and add the member. Owners can also remove existing members using the **Remove** button. The interface distinguishes between owner and member permissions.

**[Screenshot: Member Management Page]**

### 5.5 AI Chat

Open **AI Chat** and select a workspace. Choose one or more completed documents from the **Context Documents** panel, enter a question, and select **Send Message**. The chat displays the submitted question, processing status, and resulting response when available. Previous interactions are displayed in the conversation history.

**[Screenshot: AI Chat Page]**

### 5.6 Activity History

Navigate to **Activity** using the sidebar or through an individual workspace. The activity timeline displays recorded events, including document changes, membership updates, workspace creation, and completed AI queries. Users can filter events using **All Activity**, **Documents**, **Members**, **AI Queries**, or **Workspaces**.

**[Screenshot: Activity Timeline Page]**

## 6. Development Guide

**Responsible: Nathes, with input from Lucas, Nuo, and Sid**

### 6.1 Prerequisites

**Nathes, Lucas, Nuo: Add additional prerequisites for Kubernetes, PostgreSQL, backend services, and LLM processing.**

The following software is required for local development:

- **Git:** For cloning and managing the project repository.
- **Node.js 24 and npm:** For installing frontend dependencies and running the React application.
- **Docker and Docker Compose:** For building and running containerized services.
- **Web Browser:** For accessing and testing the frontend application.

### 6.2 Local Setup

**Responsible: Nathes**

With Docker Desktop running, clone the repository and open it in PowerShell. The infrastructure files are currently on `nathes-cloud`.

```powershell
git clone --branch nathes-cloud https://github.com/NathesMehan/ECE1779-Project-Team-8.git
cd ECE1779-Project-Team-8
Copy-Item .env.example .env
```

For an existing checkout, use the repository root and keep the existing `.env` if there already is one. Set `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in `.env` using `.env.example` as a template. Use a local development password and keep `.env` out of Git.

Start the frontend and PostgreSQL:

```powershell
docker compose up -d --build frontend db
```

### 6.3 Database & Backend Setup

**Responsible: Lucas**

[Database configuration, migrations, backend setup, and verification.]

### 6.4 Frontend Setup

**Responsible: Sid**

The frontend is implemented using React, TypeScript, and Vite. To run it locally, navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm ci
```

Start the development server:

```bash
npm run dev
```

The application is accessible at `http://localhost:5173`.

For development, Vite proxies requests beginning with `/api` to `http://localhost:3000`, where the backend runs. 

To create a production build:

```bash
npm run build
```

The compiled files are generated in the `dist` directory.

The frontend can also be built and served through Docker:

```bash
docker build -t context-workspace-frontend ./frontend
docker run --rm -p 8080:80 context-workspace-frontend
```

Run these Docker commands from the repository root. The containerized frontend is accessible at `http://localhost:8080` and uses Nginx to serve static files and proxy API requests. The current Nginx configuration targets `host.docker.internal:3000` for local Docker development.

### 6.5 LLM & Background Worker Setup

**Responsible: Nuo**

[Required environment variables, worker configuration, and LLM setup.]

### 6.6 Testing Instructions

**Responsible: All members**

**Sid: Add final test results and any completed frontend-backend integration tests.**

**Lucas: Add backend API and database testing instructions.**

**Nuo: Add document extraction, background processing, and LLM testing instructions.**

**Nathes: Add Docker Compose, Kubernetes, persistent storage, deployment, and monitoring verification instructions.**

The frontend can be verified independently using the following commands from the `frontend` directory:

```bash
npm run build
npm run lint
```

The production build checks TypeScript compilation and generates optimized application files, while the lint command performs static code checks.

Manual frontend testing covers authentication navigation, workspace creation, document upload validation, member management, AI chat interactions, and activity filtering using mock APIs.

#### Infrastructure verification (Nathes)

**Docker Compose.** After starting the services in section 6.2, run `docker compose ps frontend db`. PostgreSQL should show `healthy`, and the frontend should load at [http://localhost:8080/login](http://localhost:8080/login). Both checks passed with the local Compose setup.

**Compose persistent storage.** In PowerShell, write a fresh test row, recreate the database container, and query for the same row. Continue past the insert once it reports `INSERT 0 1`.

```powershell
$marker = Get-Random -Minimum 100000 -Maximum 2147483647
@"
CREATE TABLE IF NOT EXISTS infra_persistence_check (id integer PRIMARY KEY);
INSERT INTO infra_persistence_check VALUES ($marker);
"@ | docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB'

docker compose up -d --force-recreate --wait db

"SELECT id FROM infra_persistence_check WHERE id = $marker;" |
  docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB'
```

The original Compose test returned row `1779` after container replacement.

**Kubernetes and persistent storage (minikube).** Use the setup below to reproduce the local cluster checks.

Run these PowerShell commands from the repository root with Docker Desktop running and `minikube` and `kubectl` installed.

1. Start minikube and load the frontend image into the cluster.

   ```powershell
   minikube -p minikube start --driver=docker
   kubectl --context=minikube get nodes
   docker build -t context-workspace-frontend:dev ./frontend
   minikube -p minikube image load context-workspace-frontend:dev
   ```

2. If you do not already have a local `.env`, copy `.env.example` to `.env` and set the PostgreSQL password for local development. Use a file containing only `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` to create the Secret. Create it once per cluster and namespace.

   ```powershell
   kubectl --context=minikube create secret generic postgres-env --from-env-file=.env
   ```

3. Apply the manifests and wait for both Deployments. The `postgres-data` claim should be `Bound`.

   ```powershell
   kubectl --context=minikube apply -f kubernetes/
   kubectl --context=minikube get pvc postgres-data
   kubectl --context=minikube rollout status deployment/postgres --timeout=120s
   kubectl --context=minikube rollout status deployment/frontend --timeout=120s
   ```

4. Forward the frontend Service to port 8081 and open [the sign-in page](http://localhost:8081/login). Press Ctrl+C to stop forwarding when finished.

   ```powershell
   kubectl --context=minikube port-forward service/frontend 8081:80
   ```

- **Frontend routing.** The sign-in page loaded directly at `http://localhost:8081/login` through `service/frontend`. The UI uses demo authentication, and the Kubernetes Nginx configuration returns HTTP 503 for `/api/` until the backend is connected.
- **PostgreSQL persistence.** After inserting test row `1779`, restarting `deployment/postgres`, and waiting for the replacement pod, PostgreSQL returned the same row.

To repeat the persistence check, insert a fresh marker, wait for the new pod, and query for the marker. Continue past the insert once PostgreSQL reports `INSERT 0 1`.

```powershell
$marker = Get-Random -Minimum 100000 -Maximum 2147483647
@"
CREATE TABLE IF NOT EXISTS infra_persistence_check (id integer PRIMARY KEY);
INSERT INTO infra_persistence_check VALUES ($marker);
"@ | kubectl --context=minikube exec -i deployment/postgres -- sh -c 'psql -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB'

kubectl --context=minikube rollout restart deployment/postgres
kubectl --context=minikube rollout status deployment/postgres --timeout=120s

"SELECT id FROM infra_persistence_check WHERE id = $marker;" |
  kubectl --context=minikube exec -i deployment/postgres -- sh -c 'psql -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB'
```

**DigitalOcean deployment and monitoring.** After deploying to DigitalOcean, check that the workloads are ready and the PostgreSQL PVC is bound to cloud-backed storage. Repeat the pod replacement test in the cloud cluster. Open the public HTTPS URL and verify the frontend and API. In the DigitalOcean monitoring dashboard, confirm that metrics are being collected and record the configured dashboard or alert. Cloud deployment and monitoring verification are pending.

## 7. Deployment Information
**Responsible: Nathes**

[Provide the live DigitalOcean application URL, deployment procedure, Kubernetes configuration, persistent storage setup, and cloud verification results.]

**Live Application:** [URL]

**Include:** Relevant deployment and monitoring evidence.

## 8. AI Assistance & Verification

**Lucas, Nuo, Nathes: Add significant AI contributions, any incorrect or incomplete suggestions, and how they were verified or corrected.**

AI tools, primarily ChatGPT, were used to support project planning, technical exploration, frontend development, and debugging. During the proposal stage, AI helped evaluate potential features, including research assistance, code analysis, and document version tracking. The team assessed these suggestions against project scope and feasibility, ultimately prioritizing research and code assistance while deferring version tracking.

During frontend development, AI assisted with React component implementation, routing, mock API design, and Docker/Nginx configuration. AI-generated suggestions were reviewed and adjusted based on application requirements. The frontend was verified through local execution, manual interface testing, and a successful Docker build.

Representative AI interactions, including their limitations and verification steps, are documented separately in [ai-session.md](./ai-session.md).

## 9. Individual Contributions
**Responsible: Each member writes their own contribution.**

### 9.1 Sidratul Muntaha — Frontend & Collaboration

Sidratul was responsible for developing the application's frontend using React, TypeScript, Vite, and CSS. This included implementing the dashboard, navigation, authentication interfaces, workspace and document management, member collaboration, AI chat, and activity history. Sidratul also developed reusable components, protected routing, and a centralized REST API client to support future backend integration.

To enable independent development, Sidratul implemented mock APIs and browser storage for testing frontend workflows before the backend was available. Additionally, Sidratul configured a multi-stage Dockerfile and Nginx for containerized frontend deployment. Responsibilities also included local testing, coordinating frontend-backend integration requirements, and preparing frontend documentation for the final report.

### 9.2 Lucas Musselman — Backend API & Database
[Describe backend implementation, API development, database design, persistence, and testing.]

### 9.3 Nuo Cheng — LLM Integration & Background Processing
[Describe document processing, worker implementation, LLM integration, and testing.]

### 9.4 Nathes Mehanathan — Deployment, Infrastructure & Security
[Describe Docker Compose, Kubernetes, DigitalOcean deployment, monitoring, security, and testing.]

## 10. Lessons Learned & Conclusion
**Responsible: All members — Sid compiles the final version.**

**Lucas, Nuo, Nathes: Add key technical challenges, architectural trade-offs, and lessons learned from backend development, LLM processing, Kubernetes, persistence, and cloud deployment.**

Developing LLM Context Workspace highlighted the importance of modular architecture, clear team responsibilities, and early coordination between application components. Separating the frontend, backend, background processing, and database allowed team members to develop their components independently. However, this approach also introduced integration challenges, particularly in establishing consistent API contracts and coordinating dependencies between services.

During frontend development, using mock APIs enabled interface development and testing before backend availability. This demonstrated the benefits of independent development while emphasizing the need for end-to-end testing to verify that components function correctly together.

## Video Demo
**Responsible: All members**

**Video URL:** [Insert video link]

[Provide a 2–5 minute demonstration of the deployed application, its main features, and important cloud technologies.]
