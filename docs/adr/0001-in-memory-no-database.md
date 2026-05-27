# ADR 0001 — In-memory state, no database

**Status:** Accepted (2026-05-27)

## Context

Requirement 7 states: "No data persistance is needed for this prototype, you may perform all the process inside memory." The system models a live restaurant queue that is naturally ephemeral.

## Decision

Hold all state (orders, bots, counters) in a single in-memory service instance. No database, no file persistence except the CLI's `result.txt` output.

## Consequences

- Simplest possible state model; the domain core is pure and trivially testable.
- State resets on process restart — acceptable for a prototype, and aligned with the spec.
- On Cloud Run this requires pinning one always-on instance (see [ADR 0005](./0005-single-cloud-run-service.md)) so the single in-memory copy is stable and timers keep running.

## Alternatives rejected

- **Postgres/Redis** — contradicts Req 7, adds deployment surface (another service, connection config), and reads as over-engineering against the README's "do not bring in all the fancy tech stuff."
