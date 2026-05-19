# Commands

## Essential Commands

| Command | Description |
|---------|-------------|
| `go run ./cmd/main.go` | Run app in **Simulation Mode** (auto-saves to `scripts/result.txt`) |
| `go run ./cmd/main.go --interactive` | Run app in **Interactive CLI Mode** (auto-saves to `scripts/result.txt`) |
| `go test ./... -v` | Run all tests with verbose output |
| `go test ./... -cover` | Run all tests with coverage report |
| `go build -o order-controller ./cmd/main.go` | Build binary |

## Interactive CLI Mode

Run with `--interactive` flag to enter interactive mode where you control the system in real-time.

### Menu Options

Once running in interactive mode, you'll see:

```
==================================================
System Status
==================================================
Total Orders Created: 0 (VIP: 0, Normal: 0)
Orders Completed:     0
Pending Orders:       0
Active Bots:          0

=== Main Menu ===
1 - Add Order
2 - Add Bot
3 - Remove Bot
4 - Exit

Select an option (1-4):
```

### Option 1: Add Order

Creates a new order with your choice of type:
- **1 - Normal**: Standard priority order
- **2 - VIP**: High priority order (processes before Normal orders)

```
Select order type:
  1 - Normal
  2 - VIP
Choice (1-2): 1
✓ Normal order added
```

### Option 2: Add Bot

Adds a new bot that immediately starts processing pending orders from the queue.

```
✓ New bot added and started processing
```

The bot will automatically:
- Pick up the next pending order
- Process it for ~10 seconds
- Move to the next order or become IDLE

### Option 3: Remove Bot

Removes the most recently added bot.

```
✓ Bot removed
```

If the bot was processing an order when removed:
- The order is returned to the front of the queue with PENDING status
- Other bots can pick it up

Error if no bots exist:
```
✗ No bots to remove
```

### Option 4: Exit

Gracefully shuts down the system and displays final statistics.

```
Shutting down system...

==================================================
Final Status
==================================================
Total Orders Processed: 4 (VIP: 2, Normal: 2)
Orders Completed:       3
Pending Orders:         1
Active Bots:            0

Goodbye!
```

### Status Display

Status updates after every action, showing:
- **Total Orders Created**: Count by type (VIP + Normal)
- **Orders Completed**: Finished and ready
- **Pending Orders**: Waiting in queue
- **Active Bots**: Currently running

**Progress Logging:** All interactive mode activity (order creation, bot addition/removal, system shutdown) is automatically logged to `scripts/result.txt` with timestamps and an interactive mode header.

## Simulation Mode (Default)

Run `go run ./cmd/main.go` (without `--interactive`) to execute the hardcoded simulation:

1. Creates 3 orders: Normal → VIP → Normal
2. Adds 2 bots
3. Waits for processing
4. Creates another VIP order
5. Removes a bot
6. Displays final results

Output saves to `scripts/result.txt` with timestamps and mode tags.

**Mode Tags:** Each run includes a mode header:
- `[HH:MM:SS] === SIMULATION MODE ===` for simulation
- `[HH:MM:SS] === INTERACTIVE MODE ===` for interactive

## Scripts (for CI/CD)

| Script | Description |
|--------|-------------|
| `./scripts/test.sh` | Run unit tests |
| `./scripts/build.sh` | Build binary → `order-controller` |
| `./scripts/run.sh` | Run binary in **Simulation Mode** → `scripts/result.txt` |

## GitHub Actions

**Workflow:** `backend-verify-result`
**Triggers:** Pull request to `main`

**Pipeline steps:**

1. `./scripts/test.sh` — Run tests
2. `./scripts/build.sh` — Build binary
3. `./scripts/run.sh` — Execute and write to `result.txt`
4. Verify `result.txt` exists and contains `HH:MM:SS` timestamps

**Requirements for PR to pass:**

- All tests must pass
- `scripts/result.txt` must not be empty
- Output must include timestamps (e.g., `[11:06:01]`)
