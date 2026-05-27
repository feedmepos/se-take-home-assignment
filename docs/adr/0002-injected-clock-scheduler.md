# ADR 0002 — Injected clock & scheduler (real time in production, fake clock in tests)

**Status:** Accepted (2026-05-27)

## Context

Each order takes a fixed 10 seconds to cook. The system must behave in real time in production (the UI and CLI genuinely wait 10s), but unit tests cannot afford to wait real seconds, and CI must stay fast and deterministic where possible.

## Decision

The domain core never reads the wall clock or calls `setTimeout` directly. It depends on two injected interfaces:

```ts
interface Clock { now(): Date; }
interface Scheduler { schedule(delayMs: number, cb: () => void): CancelHandle; }
```

- Production wires `SystemClock` (`new Date()`) and `RealScheduler` (`setTimeout`) — real 10s, real timestamps.
- Unit tests wire a `FakeClock`/`FakeScheduler` whose `advance(ms)` fires due callbacks synchronously.

The fake clock is used **only in tests** — never in any running deliverable.

## Consequences

- Time-dependent logic (10s completion, requeue, idle transitions) is tested in milliseconds, deterministically.
- The scheduler exposes a cancel handle, which bot-removal (Req 6) needs to abort an in-flight completion.
- Core has zero coupling to Node's timer APIs — a standard, defensible production pattern (dependency injection of the time source).

## Alternatives rejected

- **Direct `setTimeout` + Jest fake timers** — couples timing logic to the runtime and makes tests more brittle.
- **Tick-based core (`tick(ms)`)** — fully deterministic but pushes the real-time loop into every adapter and is a less intuitive API for the HTTP/UI layer.
