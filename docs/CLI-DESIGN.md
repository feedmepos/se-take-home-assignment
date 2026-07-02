# CLI Design Specification

This document defines the exact visual output for the McDonald's Order Management System CLI.
Agents implementing the CLI must follow these layouts character-by-character.

---

## Table of Contents

1. [Main Menu](#1-main-menu)
2. [Event Log Format](#2-event-log-format)
3. [Status Board](#3-status-board)
4. [Progress Bar](#4-progress-bar)
5. [result.txt Output](#5-resulttxt-output)
6. [Technical Notes](#6-technical-notes)

---

## 1. Main Menu

Shown on startup and after every command. The clock `🕐` ticks live every second.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│          🍔  McDonald's Order Management System                  │
│                                                                  │
│          Outlet : Main Street #042                               │
│          🕐     : 2025-07-02 14:32:25                            │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│          [1]  New Normal Order                                   │
│          [2]  New VIP Order                                      │
│          [3]  Add Bot                                            │
│          [4]  Remove Bot                                         │
│          [5]  Status Board                                       │
│          [0]  Quit                                               │
│                                                                  │
│          Enter command:                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Rules

- Clock line updates in-place every 1s using ANSI cursor control
- Single keypress input (raw mode) — no Enter key needed
- After processing a command, redraw the menu with updated clock

---

## 2. Event Log Format

Every action prints below the menu. Timestamp is a **header line**, actions are indented below it. Blank line between each timestamp block.

### Order Created

```
[2025-07-02 14:32:01]
✓ Normal Order #1 created

[2025-07-02 14:32:03]
✓ VIP Order #2 created
📋 Queue: ⭐#2 → #1
```

Queue snapshot is shown after VIP insertion to prove priority ordering.

### Bot Created

```
[2025-07-02 14:32:05]
✓ Bot #1 created
🤖 Bot #1 → picked up ⭐ VIP Order #2 (waited 2s)
```

If no pending orders:

```
[2025-07-02 14:32:05]
✓ Bot #1 created
🤖 Bot #1 idle — no pending orders
```

### Bot Completed Order

```
[2025-07-02 14:32:15]
✓ Bot #1 completed ⭐ VIP Order #2 (10s)
🤖 Bot #1 → picked up Normal Order #1 (waited 14s)
```

If no more pending orders after completion:

```
[2025-07-02 14:32:15]
✓ Bot #1 completed Normal Order #3 (10s)
🤖 Bot #1 idle — no pending orders
```

### Bot Removed (idle)

```
[2025-07-02 14:32:23]
✗ Bot #2 destroyed (was idle)
```

### Bot Removed (was processing)

```
[2025-07-02 14:32:18]
✗ Bot #1 destroyed (was processing ⭐ VIP Order #4)
↩ ⭐ VIP Order #4 returned to PENDING (waited 5s)
```

### Idle Bot Picks Up New Order

When a new order is created and an idle bot picks it up:

```
[2025-07-02 14:32:13]
✓ VIP Order #4 created
🤖 Bot #2 → picked up ⭐ VIP Order #4 (waited 0s)
```

### Icon Reference

| Icon | Meaning |
|------|---------|
| `✓` | Created / completed successfully |
| `✗` | Destroyed / removed |
| `↩` | Order returned to pending queue |
| `🤖` | Bot action |
| `📋` | Queue snapshot |
| `⭐` | VIP order prefix (used everywhere) |

---

## 3. Status Board

Opened by pressing `[5]`. Renders as a full-screen live dashboard that refreshes every 1s. Press any key to return to menu.

```
┌──────────────────────────────────────────────────────────────────┐
│  🍔 McDonald's — Main Street #042        🕐 2025-07-02 14:32:47 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🤖 BOTS (2)                                                    │
│  ┌────────┬────────────┬──────────────────────────────────────┐  │
│  │ Bot    │ Status     │ Details                              │  │
│  ├────────┼────────────┼──────────────────────────────────────┤  │
│  │ #1     │ ⚙ Working  │ ⭐ VIP Order #4                     │  │
│  │        │            │ Ordered  : 14:32:13                  │  │
│  │        │            │ Pickup   : 14:32:13                  │  │
│  │        │            │ Elapsed  : 34s                       │  │
│  │        │            │ ████████████████████ 100%            │  │
│  ├────────┼────────────┼──────────────────────────────────────┤  │
│  │ #2     │ 💤 Idle    │ Since    : 14:32:12                  │  │
│  │        │            │ Duration : 35s                       │  │
│  └────────┴────────────┴──────────────────────────────────────┘  │
│                                                                  │
│  🟡 PENDING (2)                                                 │
│  ┌────────┬────────────┬─────────────┬────────────────────────┐  │
│  │ Order  │ Type       │ Ordered     │ Waiting                │  │
│  ├────────┼────────────┼─────────────┼────────────────────────┤  │
│  │ #5     │   Normal   │ 14:32:20    │ 27s                    │  │
│  │ #3     │   Normal   │ 14:32:04    │ 43s                    │  │
│  └────────┴────────────┴─────────────┴────────────────────────┘  │
│                                                                  │
│  🟢 COMPLETE (3)                                                │
│  ┌────────┬────────────┬─────────────┬────────────┬───────────┐  │
│  │ Order  │ Type       │ Ordered     │ Completed  │ Waited    │  │
│  ├────────┼────────────┼─────────────┼────────────┼───────────┤  │
│  │ #2     │ ⭐ VIP     │ 14:32:01    │ 14:32:12   │ 1s        │  │
│  │ #1     │   Normal   │ 14:32:01    │ 14:32:12   │ 1s        │  │
│  │ #6     │ ⭐ VIP     │ 14:32:13    │ 14:32:23   │ 0s        │  │
│  └────────┴────────────┴─────────────┴────────────┴───────────┘  │
│                                                                  │
│  📊 SUMMARY                                                     │
│  ┌──────────────────────┬─────────────────────────────────────┐  │
│  │ Total Orders         │ 6 (3 VIP, 3 Normal)                │  │
│  │ Completed            │ 3                                   │  │
│  │ Pending              │ 2                                   │  │
│  │ Processing           │ 1                                   │  │
│  │ Active Bots          │ 2 (1 working, 1 idle)              │  │
│  │ Avg Wait Time        │ 3.2s                                │  │
│  └──────────────────────┴─────────────────────────────────────┘  │
│                                                                  │
│  Press any key to return to menu                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Table column definitions

**BOTS table**

| Column | Content |
|--------|---------|
| Bot | `#1`, `#2`, etc. |
| Status | `⚙ Working` or `💤 Idle` |
| Details (working) | Order name, Ordered time, Pickup time, Elapsed (live), Progress bar |
| Details (idle) | Since time, Duration (live) |

**PENDING table**

| Column | Content |
|--------|---------|
| Order | `#1`, `#2`, etc. |
| Type | `⭐ VIP` or `Normal` (with padding for alignment) |
| Ordered | `HH:MM:SS` when the order was created |
| Waiting | Live duration since creation (ticks every 1s) |

**COMPLETE table**

| Column | Content |
|--------|---------|
| Order | `#1`, `#2`, etc. |
| Type | `⭐ VIP` or `Normal` |
| Ordered | `HH:MM:SS` when order was created |
| Completed | `HH:MM:SS` when order was completed |
| Waited | Total wait time before bot picked it up |

**SUMMARY table**

| Row | Value |
|-----|-------|
| Total Orders | Count with VIP/Normal breakdown |
| Completed | Count |
| Pending | Count |
| Processing | Count |
| Active Bots | Count with working/idle breakdown |
| Avg Wait Time | Average seconds from order creation to bot pickup |

### Empty state rendering

When a section has no items, show a single row:

```
│  🟡 PENDING (0)                                                 │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  No pending orders                                          ││
│  └──────────────────────────────────────────────────────────────┘│
```

---

## 4. Progress Bar

Each bot's processing progress is shown as a bar scaled to the `processingTime` (default 10s).

### States

```
0s   ░░░░░░░░░░░░░░░░░░░░   0%
2s   ████░░░░░░░░░░░░░░░░  20%
5s   ██████████░░░░░░░░░░  50%
8s   ████████████████░░░░  80%
10s  ████████████████████ 100%
```

### Specification

- Total bar width: 20 characters
- Filled character: `█` (U+2588)
- Empty character: `░` (U+2591)
- Percentage label right-aligned after the bar
- Bar updates live every 1s in status board view

---

## 5. result.txt Output

Generated by `scripts/run.sh` via `node index.js > scripts/result.txt`. This is a scripted simulation (no interactive input). Uses the same log format as the event log but with section headers.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  🍔  McDonald's Order Management System — Simulation Results     │
│                                                                  │
│  Outlet : Main Street #042                                       │
│  Date   : 2025-07-02                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

--- Order Creation ---

[2025-07-02 14:32:01]
✓ Normal Order #1 created

[2025-07-02 14:32:01]
✓ VIP Order #2 created

[2025-07-02 14:32:01]
✓ Normal Order #3 created

[2025-07-02 14:32:01]
📋 Queue: ⭐#2 → #1 → #3

--- Bot Processing ---

[2025-07-02 14:32:02]
✓ Bot #1 created
🤖 Bot #1 → picked up ⭐ VIP Order #2 (waited 1s)

[2025-07-02 14:32:02]
✓ Bot #2 created
🤖 Bot #2 → picked up Normal Order #1 (waited 1s)

[2025-07-02 14:32:12]
✓ Bot #1 completed ⭐ VIP Order #2 (10s)
🤖 Bot #1 → picked up Normal Order #3 (waited 11s)

[2025-07-02 14:32:12]
✓ Bot #2 completed Normal Order #1 (10s)
🤖 Bot #2 idle — no pending orders

--- New Order While Processing ---

[2025-07-02 14:32:13]
✓ VIP Order #4 created
🤖 Bot #2 → picked up ⭐ VIP Order #4 (waited 0s)

[2025-07-02 14:32:22]
✓ Bot #1 completed Normal Order #3 (10s)
🤖 Bot #1 idle — no pending orders

[2025-07-02 14:32:23]
✓ Bot #2 completed ⭐ VIP Order #4 (10s)
🤖 Bot #2 idle — no pending orders

--- Bot Removal ---

[2025-07-02 14:32:23]
✗ Bot #2 destroyed (was idle)

┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📊 FINAL SUMMARY                                               │
│  ┌──────────────────────┬─────────────────────────────────────┐  │
│  │ Total Orders         │ 4 (2 VIP, 2 Normal)                │  │
│  │ Completed            │ 4                                   │  │
│  │ Pending              │ 0                                   │  │
│  │ Active Bots          │ 1                                   │  │
│  │ Avg Wait Time        │ 3.25s                               │  │
│  │ Avg Process Time     │ 10s                                 │  │
│  └──────────────────────┴─────────────────────────────────────┘  │
│                                                                  │
│  ✓ All orders processed successfully.                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Simulation scenario

The scripted simulation must exercise all 7 requirements in order:

| Step | Action | Proves Requirement |
|------|--------|--------------------|
| 1 | Create Normal Order #1 | R1: Normal order appears in PENDING |
| 2 | Create VIP Order #2 | R2: VIP placed before Normal |
| 3 | Create Normal Order #3 | R3: Order IDs are unique and increasing |
| 4 | Show queue snapshot | R2: Visual proof of VIP priority |
| 5 | Add Bot #1 → picks up VIP #2 | R4: Bot processes highest priority first |
| 6 | Add Bot #2 → picks up Normal #1 | R4: Second bot processes next in queue |
| 7 | Wait 10s → completions | R4: 10 second processing time |
| 8 | Bot goes IDLE after completion | R5: Idle when no pending orders |
| 9 | Create VIP Order #4 → idle bot picks up | R5: Idle bot resumes on new order |
| 10 | Remove Bot #2 | R6: Newest bot removed |
| 11 | Final summary | R7: All in-memory, no persistence |

### Timestamp format

- Full format: `YYYY-MM-DD HH:MM:SS`
- Time-only (in tables): `HH:MM:SS`
- CI validation regex: `[0-9]{2}:[0-9]{2}:[0-9]{2}` (passes with both formats)

---

## 6. Technical Notes

### ANSI Control

| Purpose | Escape Code |
|---------|-------------|
| Clear screen | `\x1B[2J\x1B[H` |
| Move cursor up N lines | `\x1B[<N>A` |
| Clear current line | `\x1B[2K` |
| Move cursor to column 1 | `\r` |

### Input Handling

- `process.stdin.setRawMode(true)` for single-keypress input
- `process.stdin.on('data', handler)` to read keys
- Valid inputs: `1`, `2`, `3`, `4`, `5`, `0`
- Invalid input: show brief error, redraw menu

### Live Updates

- `setInterval(1000)` updates the clock in menu header
- Status board: `setInterval(1000)` redraws the entire board (clear + redraw approach)
- Bot completion events (`setTimeout` callback) trigger an event log print immediately, even while in menu view
- When in status board view, completion events trigger a board redraw

### Two Entry Points

| File | Mode | Purpose |
|------|------|---------|
| `index.js` | Scripted | Runs simulation, outputs to stdout (piped to `result.txt`) |
| `interactive.js` | Interactive | Live CLI for interview demo |

Both files use the same `src/order-controller.js` and `src/logger.js` — only the input/output layer differs.

### Logger Module

`logger.js` exports formatting functions used by both modes:

| Function | Purpose |
|----------|---------|
| `logTimestamp()` | Returns `[YYYY-MM-DD HH:MM:SS]` string |
| `logOrderCreated(order)` | Formats order creation message |
| `logBotCreated(bot)` | Formats bot creation message |
| `logBotPickup(bot, order, waitTime)` | Formats bot pickup with wait time |
| `logBotCompleted(bot, order, processTime)` | Formats completion message |
| `logBotDestroyed(bot, reason)` | Formats removal message |
| `logOrderReturned(order, waitTime)` | Formats order returned to queue |
| `logQueueSnapshot(orders)` | Formats `📋 Queue: ⭐#2 → #1 → #3` |
| `renderMenu(clock)` | Renders the full menu box |
| `renderStatusBoard(state)` | Renders the full status board with tables |
| `renderSummary(state)` | Renders the final summary box |

### Box Drawing Characters Reference

```
┌ ─ ┐    Top corners and horizontal
│   │    Vertical sides
├ ─ ┤    T-junctions (left/right)
┼        Cross junction
└ ─ ┘    Bottom corners
┬ ┴      T-junctions (top/bottom)
```
