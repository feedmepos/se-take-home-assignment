### McDonald's Order Bot – Backend CLI Prototype
This is a backend CLI application written in Go that simulates a McDonald's order processing system. It supports normal and VIP customer orders, bot-based cooking logic, and manager controls — all in-memory, with timestamped output for tracking.

### Features
- Normal & VIP Orders: VIP orders are prioritized ahead of normal ones.
- Cooking Bots: Bots process one order at a time, taking 10 seconds per order.
- Bot Management: Manager can add or remove bots dynamically.
- Order Lifecycle: Orders move from PENDING to COMPLETE with timestamped logs.
- In-Memory Simulation: No database or persistence required.
- CLI Interface: All interactions are via command-line arguments.
- GitHub Actions Compatible: Includes build, test, and run scripts for CI.

### Project Structure
├── main.go                 # CLI entry point
├── order/                  # Core logic: queue, bots, order model
│   ├── order.go
│   ├── order_test.go       # Unit test
│   ├── queue.go
│   └── bot.go
├── script/                 # Execution scripts
│   ├── build.sh
│   ├── run.sh
│   └── test.sh
├── result.txt              # Output log with timestamps
├── go.mod                  # Go module definition
├── README.md               # Assignment documentation
└── SUBMISSION.md           # Project documentation

### How to use
1. Build the CLI
 - bash script/build.sh

2. Run Unit Tests
 - bash script/test.sh

3. Simulate a Session
 - bash script/run.sh
This will generate a result.txt file with timestamped logs showing order creation, bot activity, and completion.

### Supported Command
./mcd_order_bot new-normal   # Create a normal order
./mcd_order_bot new-vip      # Create a VIP order
./mcd_order_bot +bot         # Add a cooking bot
./mcd_order_bot -bot         # Remove the most recent bot

### Notes
- All output includes timestamps in HH:MM:SS format.
- result.txt contains meaningful logs of order processing.
- All tests in script/test.sh pass successfully.

### Assumptions
- Bots are removed in LIFO order (last added, first removed).
- If a bot is removed mid-process, its order is re-queued.
- Orders are processed strictly one at a time per bot.
- No persistence is required; all state is in memory.
