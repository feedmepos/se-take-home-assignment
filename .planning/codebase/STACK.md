# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- Not detected - No application code yet (planning phase)

**Secondary:**
- Shell (bash) - Build and test scripts in `scripts/`

**Planned (per PLAN.md):**
- TypeScript - For TanStack Start application (frontend track)
- Go or Node.js - For CLI application (backend track)

## Runtime

**Environment:**
- Not detected (no application code)

**CI/CD Runtime:**
- GitHub Actions - Backend verification via `.github/workflows/backend-verify-result.yaml`
- Go 1.23.9 (available in CI)
- Node.js 22.19.0 (available in CI)

**Package Manager:**
- Not detected (no package.json, go.mod, or similar)

## Frameworks

**Core:**
- None implemented yet

**Planned (per PLAN.md - Frontend Track):**
- TanStack Start - Full-stack React framework with SSR
- shadcn/ui - Pre-built UI components

**Planned (per PLAN.md - Backend Track):**
- CLI application (Go or Node.js)

## Key Dependencies

**Current:**
- None (no implementation)

**Planned (per PLAN.md - Frontend Track):**
- Drizzle ORM - Database ORM
- @libsql/client - Turso (LibSQL) database client
- @tanstack/store - State management
- @tanstack/react-query - Server state
- @tanstack/react-form - Form handling
- zod - Schema validation
- dexie - IndexedDB wrapper for offline storage
- vite-plugin-pwa - PWA capabilities

**Planned (per PLAN.md - Backend Track):**
- TBD (Go or Node.js implementation)

## Configuration

**Environment:**
- `.env` file present with Turso credentials
- Key configs:
  - `TURSO_DATABASE_URL` - Turso database connection string
  - `TURSO_AUTH_TOKEN` - Turso authentication token (JWT)

**Build:**
- Build script: `scripts/build.sh` (placeholder)
- Test script: `scripts/test.sh` (placeholder)
- Run script: `scripts/run.sh` (placeholder)

## Platform Requirements

**Development:**
- Any platform (scripts use bash)
- Go 1.23.9 or Node.js 22.19.0 (depending on implementation choice)

**Production:**
- Frontend: Vercel (planned per PLAN.md)
- Backend: GitHub Actions (for CLI verification workflow)

---

*Stack analysis: 2026-01-21*
*Update after implementation begins*
