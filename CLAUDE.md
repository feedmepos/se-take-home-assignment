# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is the FeedMe Software Engineer take-home assignment: build a McDonald's order controller that manages an order queue processed by cooking bots. The **Backend (Go) track** was chosen, and a working implementation now exists: a clean-architecture Go CLI (module `feedme-order-controller`, go 1.23) with an interactive REPL and a scripted demo. The full original spec lives in `README.md`.

## Architecture

Layered, dependency-rule-respecting Go clean architecture:

```
cmd/api/main.go                     entry point: signal handling, cmd.Run
internal/handler/controller/        CLI layer: cli.Command wiring, REPL, demo, presenters
internal/handler/dto/               presentation models (OrderView, BotView, StatusResponse, SummaryResponse)
internal/usecase/                   business logic (Usecase, ports: OrderRepository, BotRepository, Clock, Logger)
internal/usecase/core/              domain models (Order, Bot, Summary, OrderKind/Status, BotStatus)
internal/repository/memory/         in-memory adapters (OrderRepository, BotRegistry) satisfying usecase ports
internal/repository/entity/         storage-layer models, decoupled from usecase/core
infrastructure/{clock,logger,config} concrete, dependency-free adapters (real clock, timestamped logger, env/.env config)
pkg/{idgen,queue}                   generic helpers (ID sequence, priority queue)
```

Dependency rule: ports are declared by their consumer, not their implementer. `usecase` declares `OrderRepository`/`BotRepository`/`Clock`/`Logger`; `controller` separately declares its own `OrderUsecase`/`BotUsecase` ports (satisfied structurally by `*usecase.Usecase`) so the handler layer never imports usecase's internal port types. `internal/repository/memory` and `infrastructure/*` implement ports structurally with no upward imports. Wiring (constructing concrete adapters and injecting them into `usecase.New`) happens only in the composition root: `internal/handler/controller/root.go`'s `wire()` function, invoked once per CLI subcommand invocation. Importing `internal/repository/memory` from the handler layer there is a deliberate, documented exception to the usual dependency direction — something has to assemble the concrete graph.

Model-per-layer: `dto` (controller-facing, string-typed view models) ↔ `core` (usecase-facing domain models, typed enums with `String()`) ↔ `entity` (repository-facing storage models, deliberately decoupled from `core`). The controller's `presenter.go` maps `core.Summary` → `dto.StatusResponse`/`dto.SummaryResponse`; the usecase itself logs all lifecycle events (order creation, bot pickup/completion/destruction) through the injected `Logger` — the handler only renders `status` output and the final summary, never duplicating those log lines.

## Commands

```bash
make build      # go build -o bin/feedme ./cmd/api
make test       # go test ./... -race -v
make run        # build + ./bin/feedme interactive
make run-demo   # build + ./bin/feedme demo
make lint       # golangci-lint run ./...
make tidy       # go mod tidy
make fmt        # gofmt -l -s -w .
make clean      # rm -rf bin
```

The three scripts in `scripts/` wrap the same operations for CI (`test.sh` → `go test ./... -race -v`; `build.sh` → `go build -o bin/feedme ./cmd/api`; `run.sh` → runs `./bin/feedme demo`, writing output to `scripts/result.txt`).

`./bin/feedme interactive` command grammar (REPL, prompt on STDERR so STDOUT stays clean for piping):

```
order normal   order vip        create an order
bot add (+)    bot remove (-)   add/remove a bot (LIFO removal)
status                          render pending orders + bot states + completed count
help                            show the command list
exit / quit                     shut down and print the final summary
```

Processing time (how long a bot takes per order) is configured via the `--processing-time`/`-t` flag, the `FEEDME_PROCESSING_TIME` env var, or a `.env` file — in that precedence order, defaulting to 10s. Both `interactive` and `demo` accept it.

## Core Business Rules

- Orders flow PENDING → COMPLETE. Order numbers are unique and increasing.
- VIP orders queue ahead of all Normal orders but behind existing VIP orders.
- Each bot processes exactly 1 order at a time; processing takes 10 seconds.
- "+ Bot" creates a bot that immediately picks up pending work; idle bots wait for new orders.
- "- Bot" destroys the newest bot. If it was mid-processing, the order returns to its original position in PENDING (preserving VIP/Normal priority).
- No persistence — everything in memory.

## CI Verification (backend track)

The `backend-verify-result` workflow (`.github/workflows/backend-verify-result.yaml`) runs on every PR to `main`. It executes `test.sh`, `build.sh`, then `run.sh`, and fails unless:

- `scripts/result.txt` exists and is non-empty
- `result.txt` contains timestamps matching `HH:MM:SS` (regex `[0-9]{2}:[0-9]{2}:[0-9]{2}`)

CI environment: Go 1.23.9 and Node.js 22.19.0. `run.sh` runs with the repo root as working directory and writes to `scripts/result.txt` (via `./bin/feedme demo`).

## Submission Flow

GitHub Flow: fork, implement on a branch, open a PR against `main`, and ensure the `backend-verify-result` check passes. Keep the implementation clean and simple — the assignment explicitly warns against over-engineering and suggests scoping work to ~1 hour.
