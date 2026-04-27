# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Assignment Context

McDonald's order controller CLI for a FeedMe Software Engineer take-home assignment. Backend option selected: **Go or Node.js** CLI that simulates order queue management with cooking bots.

## GitHub Actions CI Gate

The `backend-verify-result` workflow runs on every PR to `main`. It:
1. Runs `scripts/test.sh` → must exit 0
2. Runs `scripts/build.sh` → must exit 0
3. Runs `scripts/run.sh` → must exit 0
4. Checks `scripts/result.txt`: must exist, non-empty, and contain timestamps matching `[0-9]{2}:[0-9]{2}:[0-9]{2}`

CI environment: Go 1.23.9 and Node.js 22.19.0 (ubuntu-latest).

## Scripts (must be kept executable)

```bash
scripts/test.sh   # unit test execution
scripts/build.sh  # compilation
scripts/run.sh    # runs app and writes output to scripts/result.txt
```

## Business Logic to Implement

**Order Queue (priority queue):**
- VIP orders are inserted behind existing VIP orders but before all Normal orders
- Normal orders append to the end
- Order numbers are unique and monotonically increasing

**Bots:**
- Each bot processes exactly 1 order at a time; processing takes 10 seconds
- When a bot finishes, it immediately picks up the next pending order (if any), otherwise goes IDLE
- When `+Bot`: create a new bot; if there are pending orders, it starts immediately
- When `-Bot`: destroy the **newest** bot; if it was processing an order, return that order to its **original priority position** in the pending queue (VIP before Normal)

**No data persistence required** — all state is in-memory.

## Output Format

`scripts/result.txt` must contain `HH:MM:SS` timestamps, e.g.:

```
[14:32:01] System initialized with 0 bots
[14:32:03] Bot #1 picked up VIP Order #1002 - Status: PROCESSING
[14:32:13] Bot #1 completed VIP Order #1002 - Status: COMPLETE (Processing time: 10s)
```

See `scripts/result.txt` for a complete reference simulation output.

## Submission

Fork → implement → PR to `main` → ensure `backend-verify-result` workflow passes.
