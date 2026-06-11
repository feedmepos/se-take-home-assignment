# McDonald's Order Controller — Repo Guide

Go CLI simulating cooking bots processing Normal/VIP orders (FeedMe SE take-home).
**Docs-first workflow**: `docs/` is the source of truth — read the matching design doc
before changing behavior, and write design changes back after. Start at `docs/README.md`.

## Layout

| Path | What it is |
|------|------------|
| `docs/README.md` | Docs navigation index (zh-CN) — numbered sections, 00-overview … 80-decisions |
| `docs/10-context/` | Requirements, acceptance criteria, non-goals |
| `docs/20-architecture/` | Module layout, layering, responsibility boundaries |
| `docs/30-design/` | Domain model, priority queue, order flow, concurrency, time, testing |
| `docs/40-api/` | CLI command set, flags, env vars, log format |
| `docs/50-deployment/` | Scripts + CI verification rules |
| `docs/80-decisions/` | ADRs: requeue position, wall-clock timestamps, single-mutex model |
| `cmd/order-controller/main.go` | Entry point: flags, REPL command parser (shared by interactive & batch modes) |
| `internal/controller/order.go` | `Order`, `OrderType` domain types |
| `internal/controller/queue.go` | `PriorityQueue` — VIP-before-Normal, FIFO per tier; pure, lock-free |
| `internal/controller/controller.go` | Engine: mutex-guarded state machine — bot lifecycle, assign/complete/requeue |
| `internal/controller/*_test.go` | Deterministic unit tests (huge procDur ⇒ no sleeps) |
| `scripts/build.sh` | `go build` → `bin/order-controller` |
| `scripts/test.sh` | `go test -race -v ./...` |
| `scripts/run.sh` | Builds, pipes demo script into the CLI, writes `scripts/result.txt` |
| `.github/workflows/backend-verify-result.yaml` | CI: runs test/build/run scripts, checks result.txt for `HH:MM:SS` timestamps |

## Conventions

- Layering: `main → controller → queue/order`; lower layers never import upward.
- All controller state mutations happen under the single `Controller.mu` mutex,
  including the timer-driven completion path.
- Stdlib only — no third-party dependencies.
- Default processing time is 10s/order (assignment requirement); accelerate locally
  with `PROCESS_SECONDS=1 ./scripts/run.sh` or the `-process` flag.

## Verify

```sh
./scripts/test.sh && ./scripts/build.sh && PROCESS_SECONDS=0.5 ./scripts/run.sh
```

CI regenerates `result.txt` at real 10s speed on every PR to `main`.
