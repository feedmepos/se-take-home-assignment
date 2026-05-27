# ADR 0003 — SSE + REST instead of WebSocket

**Status:** Accepted (2026-05-27)

## Context

The UI must reflect state changes it did not initiate (a bot finishing ~10s after pickup). We need a live server→client channel. The client→server traffic, by contrast, is just discrete commands (add order, add/remove bot).

## Decision

- **Server → client:** Server-Sent Events (`GET /api/events`, NestJS native `@Sse()` returning an RxJS `Observable`). On connect and on every domain event, the server pushes the **full `StatusDTO` snapshot**; the client replaces its entire state (no delta/patch logic).
- **Client → server:** plain REST under `/api` (`POST`/`DELETE`).

## Consequences

- Transport matches the data-flow shape: push-only state → SSE; discrete commands → REST.
- Full-snapshot push means the client is trivially correct — no accumulation of deltas, no risk of client/server state drift.
- `EventSource` auto-reconnects in the browser for free; a fresh snapshot is delivered on reconnect, so the client recovers to the current state immediately.
- Works cleanly on Cloud Run (HTTP/2), same origin as the API (no CORS).

## Alternatives rejected

- **WebSocket** — its defining feature is full-duplex, but the client never streams to the server here, so half the channel is unused. Mild over-engineering; adds a socket library and connection-lifecycle handling. Can be adopted later if a requirement introduces client streaming.
- **Polling** — laggy and wasteful; the genuinely under-engineered option.
