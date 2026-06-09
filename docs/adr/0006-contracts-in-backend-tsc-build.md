# ADR 0006 — Wire contracts in `backend/src/contracts.ts`; keep `tsc`/`nest build` (no webpack)

**Status:** Accepted (2026-05-27)

## Context

Wire contracts (DTOs and enums shared between backend and frontend) must be a single source of truth. A root `shared/` directory is the obvious home, but tsc infers `rootDir` from all input files: importing `../../shared` shifts the backend's output tree from `dist/src/...` to `dist/backend/src/...`, breaking the resolved paths of both `dist/main.js` and `dist/cli/scenario.js`. Enabling webpack (`nest build --webpack`) resolves the path problem via a Vite/webpack alias, but webpack bundles the `main.ts` graph only — it does not emit a standalone `dist/cli/scenario.js`. That file is the entry point that `scripts/run.sh` and CI execute directly.

## Decision

Colocate wire contracts at `backend/src/contracts.ts` (type-only; no runtime values). The backend imports them via a plain relative `import type`. The future frontend will import them via a Vite `resolve.alias` pointing at the same file. Keep the default `tsc`/`nest build` (multi-file emit), not webpack.

## Consequences

- Both `dist/main.js` and `dist/cli/scenario.js` are emitted; the CLI remains a zero-dependency standalone entry for `run.sh` and CI.
- Wire contracts remain a single source of truth with no duplication; the backend and frontend read the exact same file.
- Backend `dist/` paths are stable (`dist/main.js`, `dist/cli/scenario.js`) — no `rootDir` drift.
- Supersedes the root `shared/` shown in earlier drafts of [ADR 0004](./0004-one-core-many-adapters.md) and architecture §3.

## Alternatives rejected

- **Root `shared/` + plain `tsc`:** tsc shifts `rootDir` when cross-package imports are present, moving output to `dist/backend/src/...` and breaking both entry points.
- **Root `shared/` + webpack (`nest build --webpack`):** resolves the alias but bundles only the `main.ts` graph, dropping `dist/cli/scenario.js` — the CI entry point.
- **Duplicate DTO types in FE and BE:** violates DRY; the two copies would inevitably diverge.
