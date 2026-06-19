# McDonald's Order Controller Requirements

## 1. Overview

McDonald's wants to use automated cooking bots to reduce manual workload and improve order processing efficiency. This prototype focuses on the order controller: receiving orders, prioritizing them, assigning them to available bots, and tracking completion.

The selected delivery is a Go-based terminal user interface (TUI). The TUI is the main interactive demo, while scripts provide build, test, and non-interactive run support for CI.

## 2. Product Goal

Build a small Go TUI application that demonstrates:

- Normal and VIP order creation.
- VIP priority over normal orders.
- FIFO ordering within the same order type.
- Dynamic bot add/remove behavior.
- Automatic order processing.
- 10-second processing time per order.
- Correct recovery when a processing bot is removed.

## 3. Scope

### In Scope

- Go implementation.
- Interactive terminal UI.
- In-memory state only.
- Normal order creation.
- VIP order creation.
- Pending, processing, and completed order display.
- Bot status display.
- Add bot action.
- Remove newest bot action.
- Automated order assignment.
- Timestamped demo output in `scripts/result.txt`.

### Out of Scope

- Web frontend.
- Login or user accounts.
- Menu, cart, payment, refund, or inventory.
- Real robot hardware integration.
- Database persistence.
- Distributed queues or production infrastructure.

## 4. Core Rules

### Orders

- Every order has a unique, increasing order number.
- Order types are `NORMAL` and `VIP`.
- Order states are `PENDING`, `PROCESSING`, and `COMPLETE`.
- An interrupted order keeps its original order number.

### Pending Queue

Pending orders are sorted by:

1. VIP orders before normal orders.
2. Earlier orders before later orders within the same type.

Example:

```text
Created: Normal #1, Normal #2, VIP #3, VIP #4, Normal #5
Pending: VIP #3, VIP #4, Normal #1, Normal #2, Normal #5
```

### Bots

- Each bot processes at most one order at a time.
- Each order takes exactly 10 seconds to complete.
- Idle bots immediately pick up the highest-priority pending order.
- After completing an order, a bot immediately picks up the next pending order if one exists.
- If no order is pending, the bot becomes `IDLE`.

### Removing Bots

- The `- Bot` action removes the newest existing bot.
- If the removed bot is idle, only the bot is removed.
- If the removed bot is processing an order:
  - The timer is cancelled.
  - The order does not complete.
  - The order returns to `PENDING`.
  - The pending queue priority rules still apply.

## 5. TUI Requirements

The Go TUI should provide one clear operational screen with:

- Pending orders panel.
- Processing or bot status panel.
- Completed orders panel.
- Recent event log.
- Keyboard help.

Required actions:

| Action | Suggested Key |
| --- | --- |
| Create normal order | `n` |
| Create VIP order | `v` |
| Add bot | `+` |
| Remove newest bot | `-` |
| Quit | `q` |

The TUI must keep updating while timers are running. User input must not block order completion or bot scheduling.

## 6. Script Requirements

The repository must provide:

- `scripts/test.sh`: runs Go tests.
- `scripts/build.sh`: builds the Go application.
- `scripts/run.sh`: runs a deterministic demo suitable for GitHub Actions.

`scripts/run.sh` must write `scripts/result.txt` with meaningful timestamped output. Timestamps must use `HH:MM:SS` format.

Recommended executable modes:

```text
order-controller tui
order-controller demo
```

- `tui` launches the interactive terminal UI.
- `demo` runs a scripted simulation for CI and writes `scripts/result.txt`.

## 7. Acceptance Criteria

- Users can create normal orders from the TUI.
- Users can create VIP orders from the TUI.
- VIP orders are processed before normal orders.
- VIP orders preserve FIFO order among VIP orders.
- Normal orders preserve FIFO order among normal orders.
- Users can add bots from the TUI.
- New bots immediately process pending orders when available.
- Users can remove the newest bot from the TUI.
- Removing an idle bot does not change order state.
- Removing a processing bot returns its order to `PENDING`.
- Interrupted orders do not complete after their cancelled timer expires.
- Completed orders appear after 10 seconds of processing.
- Bots continue processing remaining pending orders automatically.
- The demo mode generates `scripts/result.txt` with `HH:MM:SS` timestamps.

## 8. Demo Scenarios

### VIP Priority

1. Create two normal orders.
2. Create one VIP order.
3. Add one bot.
4. Verify the VIP order is processed first.

### Bot Capacity

1. Create multiple orders.
2. Add one bot.
3. Add another bot.
4. Verify both bots process orders independently.

### Bot Removal

1. Create one order.
2. Add one bot.
3. Remove the bot before 10 seconds pass.
4. Verify the order returns to `PENDING` and does not complete.

## 9. Testing Focus

Tests should cover:

- Order number generation.
- VIP queue priority.
- FIFO ordering within each order type.
- Bot assignment.
- 10-second completion behavior.
- Removing idle bots.
- Removing processing bots.
- Timer cancellation for interrupted orders.
- Preventing duplicate processing or duplicate completion.
- Demo output generation with valid timestamps.

## 10. MVP Summary

The MVP is a Go TUI order scheduler, not a full restaurant system. It is complete when the interviewer can interactively create orders, manage bots, observe real-time processing, and verify the required priority and interruption behavior.
