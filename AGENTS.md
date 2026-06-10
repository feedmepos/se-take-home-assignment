# FeedMe SE Take-Home Assignment - Agent Guide

## 1. Project Overview

### Project Goal

Build a McDonald's automated cooking bot order management system as a Go CLI
application that runs locally and in GitHub Actions, processes orders through a
priority queue, manages bot lifecycle, and writes timestamped results to
`result.txt`.

### Core Business Logic

The order processing flow is:

```text
User action (add order / manage bot)
  -> Order Controller
  -> Priority Queue (VIP-first, FIFO within tier)
  -> Bot Scheduler (assigns pending orders to idle bots)
  -> Bot Worker (processes one order per bot, 10s fixed duration)
  -> result.txt (HH:MM:SS timestamped log for CI verification)
```

Key behaviors:

- **Bot creation**: `+ Bot` creates a new bot. If PENDING has orders, the bot
  immediately picks up the highest-priority order and starts processing.
- **Bot destruction**: `- Bot` removes the **newest (most recently created)**
  bot (LIFO). If that bot was processing an order, the order is rolled back:
  it returns to the **front of its priority tier** in PENDING (VIP orders at
  the front of the VIP tier, Normal orders at the front of the Normal tier).
  This preserves VIP-before-Normal ordering.
- **Idle bots**: When PENDING is empty, idle bots wait for new orders to
  arrive and pick them up immediately.

The scripted demo must be deterministic and reproducible. The interactive CLI
must support the same command set for the next-round interview walkthrough.

## 2. Tech Stack Specifications

### Language and Version

- Go 1.22+.
- Use Go modules (`go.mod` / `go.sum`) for dependency management.
- Prefer standard library packages: `time`, `sync`, `fmt`, `os`, `bufio`,
  `strings`, and `context`.
- Do not add external dependencies unless explicitly required. The stdlib covers
  all needs for this assignment.

### Application Entrypoints

- `cmd/demo/main.go` — scripted demo that runs a fixed scenario, writes
  `result.txt`, and exits. This is the CI entrypoint.
- `cmd/interactive/main.go` — interactive CLI that reads commands from stdin
  for live interview demonstration.

### Infrastructure

- GitHub Actions is the CI runner. The `backend-verify-result` workflow calls
  `scripts/run.sh` and verifies `result.txt` output.
- All state is in-memory. No file system persistence beyond `result.txt`.
- No database, no external service, no HTTP calls.

## 3. Project Structure

### Directory Map

```text
cmd/
  demo/
    main.go             Scripted CI demo entry point.
  interactive/
    main.go             Interactive CLI entry point.

internal/
  model/
    types.go            Order, Bot, and queue type definitions.
  queue/
    queue.go            Priority queue with VIP-first insertion logic.
  bot/
    bot.go              Bot lifecycle: start, stop, idle, processing.
  controller/
    controller.go       Orchestrates queue, bots, and order state.

scripts/
  test.sh               Run all unit tests (required by CI).
  build.sh              Compile both cmd targets.
  run.sh                Execute demo and write result.txt.

result.txt              CI verification output (committed after demo run).

docs/
  plan.md             Design decisions and architecture.
  test.md             Test scenarios and cases.
  todo.md             Workstream tasks.
```

Create new files only inside the package that owns the behavior. Keep the
codebase flat; do not introduce sub-packages before there is real complexity.

### Naming Conventions

- Go packages and functions use `camelCase` / `PascalCase` per Go conventions.
- Exported types: `Order`, `Bot`, `Controller`, `Queue`.
- Unexported helpers use descriptive verb-noun names: `insertOrder`,
  `assignNextOrder`, `stopBot`.
- Script files use `snake_case.sh`.
- `result.txt` line format: `[HH:MM:SS] <event description>` — defined in
  `docs/demo/plan.md`.

## 4. Coding Standards

### Error Handling

- Do not use `panic` for recoverable errors.
- Return errors from controller methods where the caller needs to react.
- For the CLI and demo, print errors to stderr and exit with a non-zero code.

### Design Principles

- Keep `queue`, `bot`, and `controller` as independent internal packages with
  clear boundaries. The controller owns both; neither package depends on the
  other.
- Do not embed business logic inside `cmd/`. Entry points should only wire
  dependencies and call controller methods.
- Keep the demo scenario defined in one place (`cmd/demo/main.go`) so the
  output is reproducible.
- Avoid over-engineering: no interfaces, no generics, no dependency injection
  unless a second implementation exists or is planned.

### Comments and Documentation

- Add comments at package level describing the responsibility of each package.
- Add inline comments only where the concurrency or priority logic is not
  self-explanatory.
- Keep human-readable scenario descriptions and output format specs in
  `docs/demo/plan.md`, not scattered across source files.

## 5. Workflow and Constraints

### Testing Requirements

- Bot stop-and-rollback behavior must have unit tests with a mock timer or
  accelerated time.
- Controller integration behavior must be covered in `docs/test.md`
  and implemented as table-driven Go tests.
- Do not make live external calls in tests. All tests must be runnable offline
  via `scripts/test.sh`.

### Blacklist

- No external Go dependencies beyond the standard library.
- No database or file persistence beyond `result.txt`.
- No HTTP server, REST API, or web UI.
- No modification of `.github/workflows/` CI files.
- No `panic` calls for business-logic errors.
- No global mutable state outside the `Controller` struct.

### Git Commit Guidance

Commit after each meaningful workstream item. Do not batch unrelated changes
into one commit.

Use Conventional Commits with messages describing the behavior change, not the
files touched. For TDD workstreams, combine tests and implementation in the
same commit. Never mix documentation-only changes with code changes.

Examples of good commit messages:

- `feat: implement VIP-first priority queue with FIFO within tier`
- `feat: add bot lifecycle with timer-based processing and LIFO removal`
- `feat: wire controller with queue and bot orchestration`
- `test: cover queue insertion ordering and bot rollback to original position`
- `feat: add scripted demo pipeline and result.txt output`
- `feat: add interactive CLI for interview walkthrough`
- `chore: add build, test, and run scripts`

The exact commit sequence depends on the development order chosen in
`docs/todo.md`. Commit when a logical unit of work is complete.
