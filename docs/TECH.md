# FeedMe Order Controller Technical Design

## Goal

Build a Go backend CLI prototype for the McDonald's order controller assignment.

The prototype must demonstrate:

- Normal and VIP order creation
- VIP priority while preserving FIFO order inside each order type
- Dynamic cooking bot creation and removal
- One order per bot at a time
- 10-second processing duration
- Cancelled bot work returning to the pending queue
- CI-friendly output written to `scripts/result.txt`

## Architecture

The implementation uses a small in-memory domain model plus a CLI entrypoint.

Core business logic lives in an internal package and is independent from terminal I/O. The CLI only translates commands into controller operations and prints events. This keeps the scheduling rules testable without relying on timers, stdin, stdout, or shell scripts.

The project uses only the Go standard library.

## Components

### Order Controller

The `OrderController` owns all mutable state:

- next order ID
- next bot ID
- pending orders
- completed orders
- active bots
- event log

It exposes methods such as:

- `AddOrder(orderType, at)`
- `AddBot(at)`
- `RemoveNewestBot(at)`
- `AdvanceTo(at)`
- `Snapshot()`

All methods return events that the CLI can print.

### Orders

Each order has:

- ID
- type: `VIP` or `Normal`
- status: `PENDING`, `PROCESSING`, or `COMPLETE`
- created time
- optional picked-up time
- optional completed time

Pending queue ordering rule:

1. VIP orders come before Normal orders.
2. Orders of the same type keep creation order.
3. If a processing order is returned after bot removal, it goes back according to the same priority and creation-time rule.

### Bots

Each bot has:

- ID
- status: `IDLE` or `PROCESSING`
- optional current order
- optional completion time

Bot rules:

- `+ Bot` creates a new bot and immediately assigns pending work if available.
- Idle bots pick up new pending work immediately.
- Each bot processes one order at a time.
- A bot completes its order after 10 seconds.
- `- Bot` removes the newest bot, meaning the active bot with the highest ID.
- If the removed bot is processing an order, that order returns to pending.

## CLI Modes

### Demo Mode

Command:

```bash
./bin/order-controller demo
```

Demo mode uses the current wall-clock time as its starting point, then advances the scenario with virtual time and does not sleep. `scripts/run.sh` redirects this output to:

```bash
scripts/result.txt
```

Every event line includes a timestamp in `HH:MM:SS` format.

### Interactive Mode

Command:

```bash
./bin/order-controller interactive
```

Supported commands:

- `normal`
- `vip`
- `+`
- `-`
- `status`
- `wait <seconds>`
- `help`
- `quit`

Interactive mode is for interview demonstration. `wait <seconds>` advances processing using real elapsed waiting.

## Scripts

### `scripts/test.sh`

Runs:

```bash
go test ./... -v
```

### `scripts/build.sh`

Builds:

```bash
mkdir -p bin
go build -o bin/order-controller ./cmd/order-controller
```

### `scripts/run.sh`

Runs:

```bash
./bin/order-controller demo > scripts/result.txt
```

## Testing Strategy

Use test-driven development for the domain package first.

Required test coverage:

- Normal order enters pending.
- Order IDs are unique and increasing.
- VIP order is inserted before Normal orders.
- VIP orders preserve FIFO order among VIP orders.
- Normal orders preserve FIFO order among Normal orders.
- A new bot immediately picks up pending work.
- A bot completes work after 10 seconds.
- A completed bot immediately picks up the next pending order.
- Idle bot picks up new order immediately.
- Removing newest idle bot removes only that bot.
- Removing newest processing bot returns its order to pending.
- Returned order cannot complete from the destroyed bot.
- Multiple bots process separate orders concurrently.
- Demo output contains `HH:MM:SS` timestamps.

## Output Format

Event output should be human-readable and stable, for example:

```text
[09:00:00] System initialized with 0 bots
[09:00:01] Created Normal Order #1 - Status: PENDING
[09:00:02] Created VIP Order #2 - Status: PENDING
[09:00:03] Bot #1 created - Status: IDLE
[09:00:03] Bot #1 picked up VIP Order #2 - Status: PROCESSING
[09:00:13] Bot #1 completed VIP Order #2 - Status: COMPLETE
```

The final output should include a short summary:

```text
Final Status:
- Total Orders Created: 4
- Orders Completed: 4
- Active Bots: 1
- Pending Orders: 0
```

## Constraints

- No persistence.
- No database.
- No HTTP API.
- No external Go dependencies.
- No frontend.
- No over-engineered scheduler or background worker framework.
- CI must pass `backend-verify-result`.
