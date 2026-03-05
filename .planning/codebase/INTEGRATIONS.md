# External Integrations

**Analysis Date:** 2026-03-04

## APIs & External Services

**AI Pricing & Metadata:**
- Pricing Registry (`backend/pricing_registry.py`, `backend/pricing_data.py`)
  - Maintains provider/model pricing and token costs
  - Serves models from OpenAI, Anthropic, Google, and others
  - Used for workflow cost estimation

**Tool Registry:**
- Tool Registry (`backend/tool_registry.py`)
  - Catalogs available tools (databases, APIs, MCP servers)
  - Provides schema tokens and execution latency estimates
  - Referenced by estimation engine

**Workflow Import Adapters:**
- Generic workflow format support
- LangGraph StateGraph format conversion
- Custom format passthrough
- Location: `backend/import_adapters.py`

## Data Storage

**Databases:**
- **Supabase PostgreSQL** (primary)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Client: `@supabase/supabase-js` (browser) + Supabase SSR utilities (Next.js server)
  - Tables:
    - `workflows` - Main workflow definitions (graph as JSONB)
    - `canvases` - Canvas/project groupings
    - `profiles` - User profile data
    - `workflow_templates` - Marketplace templates
    - `workflow_shares` - Shared workflow links with tokens
    - `canvas_thumbnails` - Cached preview images
    - `scenarios` and `preferences` - User scenario/preference storage
  - Row-Level Security: All tables enforce `auth.uid() = user_id` policies
  - Location: `supabase/migrations/` (SQL migration files)

**File Storage:**
- Supabase Storage (implied by canvas_thumbnails table)
- Used for workflow and canvas previews

**Caching:**
- Redis: Not detected
- Application-level caching: Last workflow estimates cached in `workflows.last_estimate` (JSONB)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (OAuth + email/password)
- Supported providers: Google, GitHub, and other OAuth providers (configured in Supabase dashboard)
- Flow:
  1. User initiates sign-in in AuthModal (`frontend/src/components/AuthModal.tsx`)
  2. Supabase redirects to OAuth provider or email link
  3. Callback returns to `frontend/src/app/auth/callback/route.ts`
  4. Server-side code exchanges code for session (`@supabase/ssr` createServerClient)
  5. Session cookies set via middleware (`frontend/src/lib/supabase/middleware.ts`)
  6. Client store syncs auth state (`useAuthStore`)

**Implementation:**
- Frontend: `frontend/src/lib/supabase.ts` - Browser client singleton
- Server: `frontend/src/lib/supabase/middleware.ts` - Session refresh on every request
- State management: `frontend/src/store/useAuthStore.ts` - Auth state in Zustand

## Monitoring & Observability

**Error Tracking:**
- None detected - manual error handling via try/catch in FastAPI endpoints

**Logs:**
- Application logs: Console output from Uvicorn + Next.js dev server
- No centralized logging service detected (Sentry, DataDog, etc.)
- Backend health check: `GET /health` endpoint returns `{"status": "ok"}`

**Metrics:**
- User metrics tracked in frontend (`frontend/src/lib/userMetrics.ts`)
- Activity data stored in Supabase profiles table

## CI/CD & Deployment

**Hosting:**
- **Frontend:** Vercel (inferred from config)
  - Environment: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  - Build: `npm run build` → Next.js compiled to `.next/`
  - Runtime: Node.js on Vercel edge + serverless functions

- **Backend:** Render.com
  - Service: `neurovn-api` (see `render.yaml`)
  - Build: Docker image from `backend/Dockerfile`
  - Docker image: Python 3.11-slim with pip dependencies
  - Health check: GET `/health` endpoint
  - CORS origins: `http://localhost:3000,https://neurovn.vercel.app` (configured in Render env vars)

- **Database:** Supabase Cloud (managed PostgreSQL)

**CI Pipeline:**
- None detected (no GitHub Actions, GitLab CI, etc.)
- Implied: Git push triggers Vercel frontend build + Render backend rebuild

## Environment Configuration

**Frontend Required Env Vars:**
- `NEXT_PUBLIC_API_URL` - Backend API base URL (e.g., http://localhost:8000)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (safe for browser)

**Backend Required Env Vars:**
- `FRONTEND_ORIGINS` - Comma-separated list of allowed CORS origins
- `HOST` - Bind address (default 0.0.0.0)
- `PORT` - HTTP port (default 8000, overridden by Render)

**Secrets Location:**
- Frontend: Environment variables in Vercel dashboard (or .env.local for local dev)
- Backend: Environment variables in Render dashboard (or .env file for local dev)
- Supabase: API keys stored in Supabase dashboard (project settings)

## Webhooks & Callbacks

**Incoming:**
- OAuth callback: `frontend/src/app/auth/callback/route.ts` (Supabase → Vercel)
  - Query params: `code` (OAuth auth code), `next` (redirect target)
  - Exchanges code for session using Supabase server client

**Outgoing:**
- Backend estimation API: `POST /api/estimate` - Frontendpolls for workflow cost estimates
- Workflow import API: `POST /api/import-workflow` - Frontend imports external workflow formats
- Provider/tool registries: Frontend fetches `GET /api/providers`, `GET /api/tools`, etc.

## External Workflow Import

**Supported Formats:**
- Generic: Simple `{ nodes: [...], edges: [...] }` format
- LangGraph: LangGraph StateGraph JSON (with node/edge mapping)
- Custom: Passthrough format

**API Endpoint:**
- `POST /api/import-workflow`
  - Request: `{ source: "generic" | "langgraph" | "custom", payload: {} }`
  - Response: `{ nodes: [...], edges: [...], metadata: {} }`
  - Location: `backend/main.py` (`import_workflow` handler)

## Data Flow Between Services

1. **User Authentication:**
   - Browser → Supabase Auth → OAuth Provider → Callback Route
   - Session stored in cookies, synced to frontend state via `useAuthStore`

2. **Workflow Creation/Editing:**
   - Frontend Canvas → `useWorkflowStore` (Zustand) → Auto-save to Supabase
   - Location: `frontend/src/lib/profilePersistence.ts` handles persistence

3. **Workflow Estimation:**
   - Frontend sends graph to `POST /api/estimate`
   - Backend analyzes graph topology, computes token/cost/latency
   - Response cached in `workflows.last_estimate` JSONB column

4. **Workflow Export/Import:**
   - Export: Canvas → html-to-image (PNG) + jsPDF (PDF) + JSON
   - Import: External format → `POST /api/import-workflow` → normalized nodes/edges

5. **Marketplace:**
   - Frontend publishes workflow to `workflow_templates` table
   - Others browse via `TemplateGrid` component
   - Shared workflows use signed tokens in `workflow_shares` table

---

*Integration audit: 2026-03-04*
