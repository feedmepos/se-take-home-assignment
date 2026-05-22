# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**Payment Processing:**
- Not detected

**Email/SMS:**
- Not detected

**External APIs:**
- Not detected

## Data Storage

**Databases:**
- Turso (LibSQL) - Planned per `PLAN.md`
  - Connection: via `TURSO_DATABASE_URL` environment variable in `.env`
  - Client: Planned - @libsql/client (not yet installed)
  - Migrations: Planned via Drizzle ORM
  - Schema location: `PLAN.md` (lines 113-169) contains full schema definition
  - Tables planned: users, orders, bots
  - Key features: UUID7 primary keys, soft delete via deleted_at, proper FK cascades

**File Storage:**
- Not detected (not planned for this application)

**Caching:**
- Not detected

## Authentication & Identity

**Auth Provider:**
- Not implemented
- Planned per `PLAN.md`: Sample users with roles (NORMAL, VIP, MANAGER, BOT)
- No OAuth or external auth planned

**OAuth Integrations:**
- Not detected

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Analytics:**
- Not detected

**Logs:**
- CLI output to `scripts/result.txt` (backend track)
- No logging framework planned

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel (planned per `PLAN.md`)
- Backend: GitHub Actions (for CLI verification workflow)

**CI Pipeline:**
- GitHub Actions - `.github/workflows/backend-verify-result.yaml`
  - Workflows: backend-verify-result.yaml
  - Secrets: None (`.env` is gitignored, credentials must be configured in repository settings)
  - Steps:
    - Checkout code
    - Set up Go 1.23.9
    - Set up Node.js 22.19.0
    - Make scripts executable
    - Execute test.sh
    - Execute build.sh
    - Execute run.sh
    - Verify result.txt exists and contains timestamps

## Environment Configuration

**Development:**
- Required env vars: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN (Turso credentials)
- Secrets location: `.env` (gitignored)
- The `.env` file contains actual Turso credentials (JWT token and connection URL)

**Staging:**
- Not planned

**Production:**
- Secrets management: Not yet configured
- Vercel environment variables planned (frontend track)

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Not detected

## Third-Party Services Summary

**Currently Active:**
- Turso Database - Credentials present in `.env` but not yet used by any code

**Planned (per PLAN.md):**
- Turso (LibSQL) - Primary database
- Vercel - Frontend hosting
- GitHub Actions - CI/CD for backend track

**Not Planned:**
- Payment processing (Stripe, etc.)
- Email/SMS services (SendGrid, etc.)
- Authentication providers (Auth0, Supabase Auth, etc.)
- Monitoring/analytics (Sentry, Mixpanel, etc.)

---

*Integration audit: 2026-01-21*
*Update when adding/removing external services*
