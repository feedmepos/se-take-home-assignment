# ADR 0005 — Single Cloud Run service serves API + static frontend

**Status:** Accepted (2026-05-27)

## Context

We deploy both a NestJS backend and a React frontend. GCP credits are available. The deadline is tight and the platform is not an evaluation criterion, so the priority is lowest-risk "it just works" with a single link to hand the reviewer.

## Decision

Deploy one Cloud Run service. NestJS serves the REST API, the SSE stream, and the static React build (`ServeStaticModule`, SPA fallback to `index.html`) from a single origin. One Dockerfile, one URL.

Configure `--min-instances=1 --max-instances=1` with **CPU always allocated**.

## Consequences

- **No CORS** (UI and API share an origin); one URL to submit.
- The instance pinning is required because the app relies on background 10s timers and in-memory state — Cloud Run otherwise throttles CPU between requests and may scale to zero or across instances. See [ADR 0001](./0001-in-memory-no-database.md) / [0002](./0002-injected-clock-scheduler.md).
- FE and BE deploy together; acceptable at this size.

## Alternatives rejected

- **Firebase Hosting/Vercel (FE) + Cloud Run (API)** — adds a CDN and independent deploys we don't need, plus CORS config and two URLs.
- **Multiple Cloud Run instances** — would split in-memory state; incompatible with [ADR 0001](./0001-in-memory-no-database.md) without an external store.
