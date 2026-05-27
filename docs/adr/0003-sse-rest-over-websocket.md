# ADR 0003 — SSE + REST instead of WebSocket

**Status:** Accepted (2026-05-27)

## Context

The UI must reflect state changes it did not initiate (a bot finishing ~10s after pickup). We need a live server→client channel. The client→server traffic, by contrast, is just discrete commands (add order, add/remove bot).

## Decision

- **Server → client:** Server-Sent Events (`GET /events`, NestJS native `@Sse()` returning an RxJS `Observable`).
- **Client → server:** plain REST (`POST`/`DELETE`).

## Consequences

- Transport matches the data-flow shape: push-only state → SSE; discrete commands → REST.
- `EventSource` auto-reconnects in the browser for free; less code than a socket library.
- Works cleanly on Cloud Run (HTTP/2), same origin as the API (no CORS).

## Alternatives rejected

- **WebSocket** — its defining feature is full-duplex, but the client never streams to the server here, so half the channel is unused. Mild over-engineering; adds a socket library and connection-lifecycle handling. Can be adopted later if a requirement introduces client streaming.
- **Polling** — laggy and wasteful; the genuinely under-engineered option.
