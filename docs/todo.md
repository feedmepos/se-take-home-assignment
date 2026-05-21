Plan for Golang backend implementation:

  1. Define scope and architecture (15 min)

  - Build a CLI-only simulator in memory.
  - Core entities: Order, Bot, Controller.
  - State: pending, processing (per bot), complete, nextOrderID, bots.

  2. Implement queue logic (20 min)

  - New Normal Order: append to end of pending.
  - New VIP Order: insert after last VIP, before first normal.
  - Keep order IDs unique and strictly increasing.

  3. Implement bot lifecycle (25 min)

  - + Bot: create bot and immediately pull next pending order if available.
  - Processing duration: fixed 10 seconds per order.
  - If no pending order: bot enters IDLE.
  - - Bot: remove newest bot.
  - If removed bot is busy: cancel current work and return order to pending.

  4. Implement deterministic simulation runner (20 min)

  - Hardcode a sequence of events in main to demonstrate all requirements.
  - Emit logs with [HH:MM:SS] timestamps.
  - Include final summary counts.
  - Ensure output is stable/reproducible.

  5. Add tests (30 min)

  - VIP placement rule.
  - Increasing order IDs.
  - Bot processing completes exactly after 10s.
  - Removing busy bot returns order to pending.
  - Adding bot when queue exists starts processing immediately.

  6. Wire scripts for CI (10 min)

  - scripts/test.sh: run go test ./....
  - scripts/build.sh: run go build ./....
  - scripts/run.sh: run CLI and write scripts/result.txt.

  7. Update README (15 min)

  - Prerequisites (Go 1.23.9).
  - Exact commands for build/test/run.
  - Requirement-to-implementation mapping.
  - Sample result.txt snippet with timestamps.

  8. Final validation (10 min)

  - Run scripts locally in order: test, build, run.
  - Check scripts/result.txt exists, non-empty, contains HH:MM:SS.

  Project structure:
  se-take-home-assignment/
  ├─ cmd/
  │  └─ order-controller/
  │     └─ main.go
  ├─ internal/
  │  └─ sim/
  │     ├─ controller.go
  │     ├─ types.go
  │     └─ controller_test.go
  ├─ scripts/
  │  ├─ build.sh
  │  ├─ test.sh
  │  ├─ run.sh
  │  └─ result.txt