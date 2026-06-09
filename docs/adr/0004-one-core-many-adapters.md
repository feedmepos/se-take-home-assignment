# ADR 0004 — One framework-free domain core, many thin adapters

**Status:** Accepted (2026-05-27)

## Context

The same order-control logic must drive a CI scenario runner, an interactive CLI, an HTTP/SSE API, and (transitively) a React UI. We also want the logic to be the easy-to-extend, easy-to-explain centre of the project for the interview's later rounds.

## Decision

Put all business logic in a pure-TypeScript `domain/` core (`OrderController` + entities) that imports no framework, no HTTP, and no timer APIs. Everything else is a thin adapter over it:

- `cli/` — scenario runner (CI) and interactive REPL, sharing one command dispatcher.
- `api/` — NestJS REST + SSE, plus static serving of the React build.
- The core emits a single stream of typed **domain events**; both the `result.txt` logger and the SSE push derive from it.

## Consequences

- The core is unit-tested in isolation with no mocking of I/O.
- New entry points (or Round-3 requirements) are added at the edges without touching core logic.
- "One core, three adapters, one event stream" is a clear architecture to walk through verbally.

## Alternatives rejected

- **Logic inside the NestJS controllers/services** — couples business rules to HTTP, makes the CLI a second implementation, and is harder to test.
- **A published `packages/core` workspace** — cleaner package boundary but adds TS project references and complicates the Cloud Run Docker build; not worth it at this size (the `domain/` folder gives the same isolation).
