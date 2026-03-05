# Technology Stack

**Analysis Date:** 2026-03-04

## Languages

**Primary:**
- TypeScript 5 - Frontend application and build tooling
- JavaScript - Frontend configuration (ESLint, PostCSS)
- Python 3.11 - Backend API server

**Secondary:**
- SQL - Supabase migrations for database schema
- Bash - Docker and deployment scripts

## Runtime

**Environment:**
- Node.js (version not pinned) - Frontend dev/build/runtime
- Python 3.11 - Backend API execution via uvicorn

**Package Manager:**
- npm - Frontend dependencies (no lockfile specified in package.json, but npm-lock.json likely present)
- pip - Backend dependencies

## Frameworks

**Frontend:**
- Next.js 16.1.6 - React meta-framework with App Router
- React 19.2.3 - UI library
- TypeScript 5 - Type safety

**Backend:**
- FastAPI 0.115.6 - Async Python REST API framework
- Uvicorn 0.34.0 (with standard extras) - ASGI server
- Pydantic 2.10.4 - Data validation and serialization

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework (via @tailwindcss/postcss)
- PostCSS 4 - CSS processing

**UI Components:**
- Radix UI - Headless UI component library (@radix-ui/react-label, @radix-ui/react-switch, @radix-ui/react-tooltip)
- Lucide React 0.564.0 - Icon library

## Key Dependencies

**Critical (Frontend):**
- @supabase/ssr 0.8.0 - Server-side rendering utilities for Supabase client library
- @supabase/supabase-js 2.96.0 - Supabase JavaScript SDK (auth + database client)
- zustand 5.0.11 - Lightweight state management (stores in `src/store/`)
- @xyflow/react 12.10.0 - React Flow graph visualization library
- framer-motion 12.34.2 - Animation library
- recharts 3.7.0 - React charting library for metrics visualization

**Critical (Frontend Build):**
- babel-plugin-react-compiler 1.0.0 - React 19 compiler for performance optimization
- eslint 9 - JavaScript linting
- eslint-config-next 16.1.6 - ESLint configuration for Next.js

**Infrastructure (Backend):**
- httpx 0.28.1 - Modern HTTP client library (async support)
- tiktoken 0.8.0 - Token encoding/counting (OpenAI)
- python-dotenv 1.0.1 - Environment variable loading from .env files

**Utilities (Frontend):**
- html-to-image 1.11.13 - Convert React components to images (workflow export)
- jspdf 4.1.0 - PDF generation
- jspdf-autotable 5.0.7 - Table generation for PDFs
- uuid 13.0.0 - UUID generation
- class-variance-authority 0.7.1 - CSS class management
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.4.1 - Merge Tailwind classes safely

**Graph Analysis (Backend):**
- @dagrejs/dagre 2.0.4 - Graph layout algorithm (topological sorting for DAGs)

## Configuration

**Frontend Environment:**
- `NEXT_PUBLIC_API_URL` - Backend API endpoint (http://localhost:8000 for dev)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous API key
- Configuration files: `.env.local` (local development), `.env.example` (template)

**Backend Environment:**
- `FRONTEND_ORIGINS` - CORS allowed origins (comma-separated, default: http://localhost:3000)
- `HOST` - Uvicorn bind address (default: 0.0.0.0)
- `PORT` - HTTP port (default: 8000)
- Configuration file: `backend/config.py` - Reads from environment via python-dotenv

**Build (Frontend):**
- `tsconfig.json` - Targets ES2017, strict mode, path aliases (`@/*` → `./src/*`)
- `next.config.ts` - React Compiler enabled (babel-plugin-react-compiler)
- `eslint.config.mjs` - ESLint 9 flat config with Next.js + TypeScript rules
- `postcss.config.mjs` - Tailwind CSS 4 with PostCSS

**Build (Backend):**
- `Dockerfile` - Python 3.11 slim image, Docker context at `./backend`
- `requirements.txt` - Pinned dependency versions

## Platform Requirements

**Development:**
- Node.js (recommended: latest LTS or 18+, not version-pinned)
- npm 6+ (package manager)
- Python 3.11 (backend runtime)
- PostgreSQL (via Supabase cloud or local)

**Production:**
- Frontend: Vercel (Next.js optimized, implied from Render config pointing to neurovn.vercel.app)
- Backend: Render (Docker-based, see render.yaml)
- Database: Supabase (PostgreSQL + Auth SaaS)

## Deployment

**Frontend:**
- Vercel (inferred from FRONTEND_ORIGINS config)
- Deployed via git push to Vercel

**Backend:**
- Render.com via Docker
- Service name: `neurovn-api`
- Runtime: Docker (Dockerfile from `./backend/Dockerfile`)
- Region: Oregon
- Plan: Starter
- Entry point: `python main.py` runs uvicorn with auto-reload for local, Render injects PORT env var

**Database:**
- Supabase PostgreSQL (cloud-hosted)
- Migrations in `supabase/migrations/` (SQL files)
- Tables: workflows, canvases, profiles, scenarios, templates, shares
- Row-Level Security (RLS) policies for multi-tenant isolation

---

*Stack analysis: 2026-03-04*
