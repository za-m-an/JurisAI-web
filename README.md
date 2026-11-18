# Juris AI — Web Service (`web/`)

The **Juris AI Web Service** is a Next.js 14 (App Router) + TypeScript full-stack web application providing user registration, role-based access control (`common`, `business`, `lawyer`, `admin`), an **upload-analyse-discard** in-memory document analysis pipeline, corpus-verified citation badges, multi-jurisdictional legal chat (`BD`, `US`, `EU`), and a privacy-by-design administration console.

## 1. Local Development (Zero External Credentials)

By default, when `DATABASE_URL` is unset, the web service uses `@electric-sql/pglite` (persisted locally to `web/.data/pglite` or in-memory during tests) and auto-generates development secrets (`web/.data/dev-secret` and `web/.data/dev-enc-key`).

```bash
cd web
npm install
cp .env.example .env

# Run SQL migrations (web/migrations/001_initial.sql) and seed dev admin (admin@juris.local / ChangeMe12345)
npm run db:migrate

# In Terminal 1: Start either the Mock RAG server OR the real Python RAG service on port 8001
npm run mock:rag
# (Or: cd ../rag && uvicorn app.server:app --host 0.0.0.0 --port 8001)

# In Terminal 2: Start the Next.js development server on port 3000
npm run dev
```

### Running Lint, Production Build, and Tests

```bash
cd web
npm run lint
npm run build
npm test
```

## 2. Production Deployment (Vercel + Neon PostgreSQL + RAG Container)

Follow these exact 4 steps to deploy Juris AI to production:

### Step 1: Create a Neon PostgreSQL Project
1. Create a new PostgreSQL project on [Neon](https://neon.tech).
2. Copy the **pooled** connection string (`postgres://...@ep-...-pooler...neon.tech/neondb?sslmode=require`) and set it as `DATABASE_URL`.

### Step 2: Run Database Migrations Against Neon
Run the idempotent SQL migration and initial admin seed once against your Neon database:
```bash
cd web
DATABASE_URL="postgres://..." ADMIN_EMAIL="admin@yourdomain.com" ADMIN_PASSWORD="YourStrongPassword123" npm run db:migrate
```

### Step 3: Import `web/` as a Vercel Project
1. Import the repository into Vercel and set the **Root Directory** to `web`.
2. Configure the following required Environment Variables in Vercel:
   - `NODE_ENV=production`
   - `DATABASE_URL=<your-neon-pooled-connection-string>`
   - `DB_DRIVER=pg`
   - `JWT_SECRET=<32+ char high-entropy random secret>`
   - `SETTINGS_ENC_KEY=<base64-encoded 32-byte key: openssl rand -base64 32>`
   - `RAG_BASE_URL=<your-deployed-rag-service-url>`
   - `RAG_API_KEY=<your-rag-api-key>`
   - `NEXT_PUBLIC_APP_NAME=Juris AI`
3. Deploy. Note that `web/vercel.json` configures `maxDuration: 300` (300 seconds) for `/api/analyze` and `/api/chat`. Because Vercel serverless functions enforce a hard **4.5 MB request body limit**, file uploads in Juris AI are capped at **4 MB** (`max_upload_mb=4`).

### Step 4: Connect and Verify the RAG Service in Admin > Integrations
1. Deploy the Python RAG container to Render or Google Cloud Run following [`../rag/README.md`](../rag/README.md).
2. Log in to the Juris AI web app using your `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. Open **Admin → Integrations → Juris AI RAG Service (`rag`)**, enter the deployed RAG Base URL and `RAG_API_KEY` (stored encrypted at rest with AES-256-GCM), save, and click **Test Connection** to verify live `/health` status and latency.
