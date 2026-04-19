# CLAUDE.md

## Project Overview

McDonald's order bot controller — a take-home assignment for FeedMe. Implements an order management system with VIP-priority queuing and configurable cooking bots.

## Architecture

- `src/mcdonald.ts` — Core domain: `Order`, `Bot`, `Manager` classes with event-driven design
- `src/index.ts` — Interactive CLI (readline-based), supports `--simulate` mode with virtual clock
- `tests/mcdonald.test.ts` — Unit tests + 100K-operation fuzz test
- `scripts/validate.ts` — Validates `result.txt` output against 10 invariants
- `scripts/simulation.input` — Predefined scenario for CI

## Key Design Decisions

- **Clock injection**: `Bot` accepts a `Clock` interface for testability (fake clock in tests, sim clock in CLI)
- **Event system**: `Manager.onEvent` emits typed events (`ManagerEvent` union) for UI/logging integration
- **VIP priority**: `insertOrder` maintains VIP-before-normal ordering in a single array; see comments in `mcdonald.ts` for O(1) improvement path using dual deques
- **Order IDs start at 1000** (`orderIdCounter = 999`)

## Commands

```bash
npm test                  # Run unit tests (25 tests including fuzz)
npx tsx src/index.ts      # Interactive CLI mode
npx tsx src/index.ts --simulate < scripts/simulation.input  # Simulation mode
npx tsx scripts/validate.ts scripts/result.txt              # Validate output
```

## CLI Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `order normal` | `n` | Create normal order |
| `order vip` | `v` | Create VIP order |
| `bot add` | `+` | Add cooking bot |
| `bot remove` | `-` | Remove newest bot (LIFO) |
| `status` | `s` | Show current state |
| `sleep <ms>` | — | Advance time (sim mode) |
| `exit` | `q` | Exit |

## CI Pipeline

`.github/workflows/backend-verify-result.yaml` runs: `test.sh` → `build.sh` → `run.sh`, then checks `scripts/result.txt` exists with HH:MM:SS timestamps.

## Validation Rules (10 checks)

1. Order ID strictly increasing
2. Bot ID strictly increasing
3. Pickup references valid order
4. No duplicate completion
5. Processing time ~10s (9-11s tolerance)
6. Bot exclusive (one order at a time)
7. VIP priority (no normal picked while VIP pending)
8. Bot post-completion state (pickup if pending, idle if empty)
9. Destroy consistency (destroyed bot's order matches actual processing)
10. Summary accuracy
