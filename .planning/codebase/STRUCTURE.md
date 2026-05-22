# Codebase Structure

**Analysis Date:** 2026-01-21

## Directory Layout

```
se-take-home-assignment/
├── .github/              # GitHub Actions workflows
│   └── workflows/
│       └── backend-verify-result.yaml
├── .planning/            # Project planning documents
│   └── codebase/         # Codebase mapping documents
├── scripts/              # Build, test, and run scripts
│   ├── build.sh         # Build script (placeholder)
│   ├── run.sh           # Run script (placeholder)
│   ├── test.sh          # Test script (placeholder)
│   └── result.txt       # Sample CLI output
├── .env                  # Environment variables (Turso credentials)
├── .gitignore            # Git ignore rules
├── LICENSE               # MIT License
├── PLAN.md               # Detailed implementation plan
├── README.md             # Assignment description and submission notes
└── TEST.md               # Manual test checklist
```

## Directory Purposes

**.github/workflows/**
- Purpose: GitHub Actions CI/CD workflows
- Contains: backend-verify-result.yaml - verifies CLI application execution
- Key files: backend-verify-result.yaml
- Subdirectories: None

**.planning/**
- Purpose: Project planning and documentation
- Contains: codebase/ (this directory)
- Subdirectories: codebase/ (generated mapping documents)

**scripts/**
- Purpose: Build, test, and execution scripts for backend track
- Contains: Shell scripts for CI/CD workflow
- Key files:
  - build.sh - Compilation steps (placeholder)
  - test.sh - Unit test execution (placeholder)
  - run.sh - CLI execution with output to result.txt (placeholder)
  - result.txt - Sample output showing expected timestamp format
- Subdirectories: None

## Key File Locations

**Entry Points:**
- Not implemented (project in planning phase)

**Configuration:**
- `.env` - Turso database credentials (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
- `.gitignore` - Git ignore rules (only .env)

**Documentation:**
- `README.md` - Assignment requirements and submission notes
- `PLAN.md` - Comprehensive implementation plan (TanStack Start + Drizzle + Turso)
- `TEST.md` - Manual test checklist
- `LICENSE` - MIT License

**Scripts:**
- `scripts/build.sh` - Build script placeholder
- `scripts/test.sh` - Test script placeholder
- `scripts/run.sh` - Run script placeholder

**CI/CD:**
- `.github/workflows/backend-verify-result.yaml` - GitHub Actions workflow for backend verification

## Naming Conventions

**Files:**
- UPPERCASE.md for major project files (README, PLAN, TEST, LICENSE)
- kebab-case.sh for shell scripts (build.sh, test.sh, run.sh)
- kebab-case.yaml for workflow files

**Directories:**
- kebab-case for all directories (.github, .planning, scripts)
- Plural for collections: scripts/, workflows/

**Special Patterns:**
- dot-prefix for hidden/config directories (.github, .planning, .env, .gitignore)

## Where to Add New Code

**Frontend Track (Planned):**
- Primary code: app/ (TanStack Start file-based routing)
- Routes: app/routes/
- API routes: app/api/
- Components: app/components/
- Database: app/db/
- Store: app/store/
- Hooks: app/hooks/
- Lib utilities: app/lib/
- Tests: Co-located or __tests__/ directories

**Backend Track (Planned):**
- CLI entry point: Root directory or cmd/
- Source code: src/ or pkg/ (Go) or src/ (Node.js)
- Tests: Co-located or tests/ directory
- Scripts: Already in scripts/

**Configuration:**
- Environment variables: .env
- Build configs: Root directory (vite.config.ts, tsconfig.json, etc.)

## Special Directories

**.github/**
- Purpose: GitHub-specific configuration
- Source: Version controlled in repository
- Committed: Yes

**.planning/**
- Purpose: Project planning and codebase mapping
- Source: Generated documents
- Committed: Yes

**scripts/**
- Purpose: CI/CD executable scripts
- Source: Version controlled
- Committed: Yes

---

*Structure analysis: 2026-01-21*
*Update when directory structure changes*
