# Juris AI — Web Platform (`web/`)

The **Juris AI Web Platform** is a Next.js 14 (App Router) + TypeScript full-stack legal advisory application providing cross-border contract analysis, strategic legal consultation, institutional letterhead PDF reporting, and regional law firm matching across **Bangladesh (`BD`)**, **United States (`US`)**, and **European Union (`EU`)**.

## 1. Key Capabilities

- **Authentication & Onboarding**: Standard login portal (`/login`) and registration (`/register`) with mandatory Terms of Service & Data Handling acceptance.
- **Home Workspace (`/dashboard`)**: Monthly usage allowance tracking, interactive recent searches & queries slide, and ongoing case legal strategy recommendations.
- **Legal Copilot (`/chat`)**: Conversational legal assistant grounded in statutory law, seamlessly expandable from any analyzed contract report.
- **Document Analyzer (`/analyze` & `/analyses/[id]`)**: In-memory `.pdf`, `.docx`, and `.txt` upload with governing law selection (`BD`, `US`, `EU`), extra case context input, step-by-step review progress, unique Reference IDs (`JRS-YYYY-XXXXXX`), **Expand** to Copilot, and jurisdiction-adaptive **Formal Letterhead PDF** export.
- **Regional Law Firms (`/lawyers`)**: Curated regional chambers directory with AI-calibrated case suitability ratings, notable precedents, and direct contact details.
- **Settings Hub (`/settings`)**: Dedicated sub-pages for Profile & Avatar (`/settings/profile`), Language (`/settings/language`), Subscription (`/settings/subscription`), and Account Security (`/settings/security`).

## 2. Local Development

When `DATABASE_URL` is unset, the web service uses `@electric-sql/pglite` locally and auto-generates development secrets in `web/.data/`.

```bash
cd web
npm install
cp .env.example .env

# Run SQL migrations
npm run db:migrate

# In Terminal 1: Start the Python RAG service (or mock server) on port 8001
npm run mock:rag

# In Terminal 2: Start the Next.js development server on port 3000
npm run dev
```

### Running Typecheck, Build, and Tests

```bash
cd web
npx tsc --noEmit
npm run build
npm test
```

## 3. Production Deployment (Vercel + PostgreSQL)

1. Provision a managed PostgreSQL database (such as Neon) and copy the pooled connection string to `DATABASE_URL`.
2. Import this repository into **Vercel** and configure the required Environment Variables:
   - `NODE_ENV=production`
   - `DATABASE_URL=<your-pooled-postgres-connection-string>`
   - `DB_DRIVER=pg`
   - `JWT_SECRET=<high-entropy-secret>`
   - `SETTINGS_ENC_KEY=<base64-encoded-32-byte-key>`
   - `RAG_BASE_URL=<your-deployed-rag-service-url>`
   - `RAG_API_KEY=<your-rag-api-key>`
   - `NEXT_PUBLIC_APP_NAME=Juris AI`
3. Deploy. SQL migrations in `web/migrations/` run automatically on initialization.
