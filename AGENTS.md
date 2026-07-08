# AGENTS.md

Agent-focused guide for the McDonald's Order Controller backend CLI (Go take-home assignment).

## Project Overview

In-memory CLI that orchestrates Normal/VIP order queues and cooking bots. No persistence, no third-party Go dependencies.

| Item | Value |
|------|-------|
| Language | Go 1.23.9 (stdlib only) |
| Module | `github.com/lijian-bj/se-take-home-assignment` |
| Entry point | `cmd/order-controller/main.go` |
| Binary output | `bin/order-controller` |
| Architecture | DDD + Hexagonal (Clean Architecture) |

**Business rules (high level):**

- VIP orders dequeue before Normal orders; each segment is FIFO.
- Each bot processes one order at a time (default 10s, configurable).
- `+bot` creates a bot and may immediately pick the next pending order.
- `-bot` removes the **latest** bot (LIFO); interrupted orders reinsert at original `pickupIndex`.
- All events log to stdout with `HH:MM:SS` timestamps.

Human-facing docs: `README.md`, `docs/PRD.md`, `docs/ORD.md`. Technical design: `docs/superpowers/specs/2026-07-06-order-controller-backend-design.md`.

## Architecture & Dependency Rules

```
cmd/order-controller          → composition root (main, flags)
internal/infrastructure/      → adapters (cli, clock, logging, config/di)
internal/application/         → use cases (ordercontroller service, port interfaces)
internal/domain/ordercontroller → pure domain (aggregate, entities, queue rules)
```

**Dependency direction (strict):**

```
infrastructure → application → domain
domain imports nothing from outer layers
```

| Layer | Package | Responsibility |
|-------|---------|----------------|
| Domain | `internal/domain/ordercontroller` | `OrderController` aggregate, `Order`, `Bot`, `PendingQueue` — no I/O, no time, no goroutines |
| Application | `internal/application/ordercontroller` | `Service` — mutex, timers, orchestration |
| Ports | `internal/application/port` | `Clock`, `EventLog`, `TimerHandle` interfaces |
| Infrastructure | `internal/infrastructure/*` | CLI, real/mock clock, event logger, DI wiring |
| Cmd | `cmd/order-controller` | Parse flags, wire deps, select run mode |

**Where new code goes:**

- Pure business rules → `internal/domain/ordercontroller/`
- Scheduling, concurrency, side effects → `internal/application/ordercontroller/`
- New external interfaces → implement in `internal/infrastructure/` against `internal/application/port/`
- Do **not** put `main` under `internal/`; keep it in `cmd/`

There is only one domain package (`ordercontroller`) because the project has a single bounded context and one aggregate root.

## Setup Commands

```bash
# From repository root
go version    # must be 1.23.9

# No go mod download needed — stdlib only
./scripts/build.sh
```

Scripts use `set -euo pipefail` and `cd` to repo root via `$(dirname "$0")/..`. Run them from anywhere:

```bash
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

## Development Workflow

### Build

```bash
go build -o bin/order-controller ./cmd/order-controller
# or
./scripts/build.sh
```

### Run modes

**Batch file (CI scenario):**

```bash
./bin/order-controller --batch scripts/scenarios/ci.txt --process-duration=100ms
```

**Interactive REPL:**

```bash
./bin/order-controller --interactive --process-duration=2s
```

**Stdin pipe (default when no flags):**

```bash
echo -e "normal\nvip\n+bot\nstatus\nquit" | ./bin/order-controller --process-duration=1s
```

### CLI flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--batch <path>` | — | Run commands from script file |
| `--interactive` | `false` | REPL with `>` prompt |
| `--process-duration` | `10s` | Per-order bot processing time |

### Batch / REPL commands

`normal`/`n`, `vip`/`v`, `+bot`/`addbot`, `-bot`/`removebot`, `status`/`s`, `wait <duration>`, `quit`/`q`

Lines starting with `#` and blank lines are ignored in batch files.

## Testing Instructions

### Run all tests (required before PR)

```bash
./scripts/test.sh
# equivalent:
go test ./... -race -v -count=1
```

### Run a single package

```bash
go test ./internal/domain/ordercontroller/... -race -v -count=1
go test ./internal/application/ordercontroller/... -race -v -count=1
go test ./internal/infrastructure/cli/... -race -v -count=1
```

### Run one test

```bash
go test ./internal/application/ordercontroller/... -race -run TestVIPPreemptsNormal -v -count=1
```

### Coverage

```bash
go test ./... -race -coverprofile=coverage.out -count=1
go tool cover -func=coverage.out
```

### Testing conventions

- Domain tests: table-driven, no real sleeps — pure logic only.
- Application tests: use `internal/infrastructure/clock.Mock` and inject via `port.Clock`.
- Unit tests must not depend on wall-clock timing; use mock clock `Advance()`.
- Test files live next to source: `*_test.go` in the same package.
- Always run with `-race` — the service uses `sync.Mutex` and timers.

## Code Style

- **Go version:** 1.23.9 (match `go.mod` and CI).
- **Dependencies:** stdlib only — do not add third-party modules unless explicitly requested.
- **Comments:** Chinese comments exist in domain/application code; match surrounding style when editing.
- **Naming:** exported types use Go conventions; domain aggregate is `OrderController`.
- **Errors:** domain errors in `internal/domain/ordercontroller/errors.go`; application returns wrapped errors for CLI.
- **Concurrency:** all mutable state in `Service` guarded by one mutex; timer callbacks must re-acquire mutex before mutating.
- **No anemic domain:** queue rules, bot state transitions, and assignment logic belong in domain, not in CLI or service.

### Anti-patterns to avoid

- Importing infrastructure from domain or application packages
- Putting business rules in `internal/infrastructure/cli`
- Real `time.Sleep` in domain unit tests
- Adding repository/DB layers — in-memory only for this project
- Splitting `Order`, `Bot`, `PendingQueue` into separate domain packages (same aggregate)

## Build and CI

### Local verification (mirrors CI)

```bash
./scripts/test.sh && ./scripts/build.sh && ./scripts/run.sh
cat scripts/result.txt
```

### CI workflow

File: `.github/workflows/backend-verify-result.yaml`  
Trigger: PRs to `main`

Steps: `test.sh` → `build.sh` → `run.sh` → verify `scripts/result.txt` is non-empty and contains `HH:MM:SS` timestamps.

### `scripts/run.sh` behavior

```bash
PROCESS_DURATION="${ORDER_PROCESS_DURATION:-10s}"
./bin/order-controller --batch scripts/scenarios/ci.txt --process-duration="${PROCESS_DURATION}" > scripts/result.txt
```

- Default process duration: **10s**
- Override for fast local runs: `ORDER_PROCESS_DURATION=100ms ./scripts/run.sh`
- **`wait` in batch scripts must exceed total processing time** or the CLI exits with code 1 (`timeout waiting for idle`), and `set -e` fails the shell script.

Current CI scenario (`scripts/scenarios/ci.txt`) uses `wait 25s` to accommodate the 10s default with two concurrent bots.

## Debugging & Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `run.sh` exits 1, no "execution completed" | `wait` timeout in batch script | Increase `wait` duration or reduce `--process-duration` |
| Empty or incomplete `result.txt` | Build missing or program crashed early | Run `./scripts/build.sh` first; check stderr without redirect |
| Tests pass locally, CI fails | Go version mismatch | Use Go 1.23.9 |
| Race detector failure | Mutex/timer bug in `Service` | Fix locking in timer callbacks |

Capture stderr when debugging batch runs:

```bash
./bin/order-controller --batch scripts/scenarios/ci.txt --process-duration=100ms 2>&1 | tee /tmp/out.txt
```

## Pull Request Guidelines

Before opening a PR to `main`:

1. `./scripts/test.sh` — all tests green with race detector
2. `./scripts/build.sh` — builds successfully
3. `./scripts/run.sh` — produces valid `scripts/result.txt`
4. Do not commit secrets or local-only artifacts unnecessarily
5. Keep changes scoped; respect layer boundaries

Suggested commit style (from repo history): `feat:`, `fix:`, `docs:` prefixes with concise English or Chinese descriptions.

## Key Files Reference

| File | Purpose |
|------|---------|
| `cmd/order-controller/main.go` | CLI entry, flag parsing |
| `internal/infrastructure/config/di.go` | Composition root wiring |
| `internal/application/ordercontroller/service.go` | Application service + timers |
| `internal/domain/ordercontroller/aggregate.go` | Aggregate root |
| `internal/domain/ordercontroller/pending_queue.go` | VIP-priority queue |
| `internal/infrastructure/cli/runner.go` | Command execution |
| `internal/infrastructure/cli/parser.go` | Command parsing |
| `internal/infrastructure/clock/mock.go` | Test clock |
| `scripts/scenarios/ci.txt` | CI batch scenario |

## Additional Notes

- `scripts/result.txt` is generated output for CI verification; may be modified locally after runs.
- `bin/order-controller` may exist in the workspace; rebuild after code changes.
- Frontend path is out of scope — backend CLI only.
- When changing default `--process-duration` or `scripts/run.sh`, always update `scripts/scenarios/ci.txt` `wait` accordingly.
