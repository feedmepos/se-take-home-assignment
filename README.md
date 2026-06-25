# McDonald Order Management System

A Go-based CLI application for managing McDonald order processing with VIP priority queues and cooking bot automation.

## Features

- **Order Types**: Normal and VIP orders with priority queue
- **VIP Priority**: VIP orders are processed before Normal orders
- **Bot Automation**: Add/remove cooking bots that process orders in 10 seconds
- **Unique Order IDs**: Auto-incrementing order IDs
- **Timestamp Logging**: All operations logged with `HH:MM:SS` format
- **Thread-safe**: Concurrent operations using Go goroutines and mutex

## Quick Start

```bash
# Build
./script/build.sh

# Run
./bin/mcdonald

# Test
./script/test.sh
```

## Commands

| Command | Description |
|---------|-------------|
| `normal` | Create a normal order |
| `vip` | Create a VIP order |
| `add-bot` | Add a cooking bot |
| `remove-bot` | Remove the newest bot |
| `status` | Show system status |
| `exit` | Exit the program |

## Example

```bash
$ echo -e "normal\nvip\nnormal\nadd-bot\nstatus\nexit" | ./bin/mcdonald

=== McDonald Order Management System ===
Commands: normal, vip, add-bot, remove-bot, status, exit

18:48:34 - Order #1 created (Normal) - PENDING
18:48:34 - Order #2 created (VIP) - PENDING
18:48:34 - Order #3 created (Normal) - PENDING
18:48:34 - Bot #1 created and idle
18:48:34 - Bot #1 processing Order #2 (VIP)
18:48:34 - === Status ===
18:48:34 - PENDING (2):
18:48:34 -   #1 Normal PENDING
18:48:34 -   #3 Normal PENDING
18:48:34 - PROCESSING (1):
18:48:34 -   Bot #1: Order #2 (VIP)
18:48:34 - COMPLETE (0):
18:48:34 - BOTS (1):
18:48:34 -   Bot #1: PROCESSING - Order #2 (VIP)
18:48:34 - =============
Goodbye!
```

## Project Structure

```
McDonald/
├── cmd/cli/main.go           # CLI entry point
├── internal/
│   ├── model/               # Data models (Order, Bot)
│   ├── queue/               # Priority queue implementation
│   ├── system/             # State management
│   └── output/             # Output writer
├── script/                   # Build, run, test scripts
├── docs/                     # Documentation
├── go.mod
└── result.txt               # Output log
```

## Documentation

- [Project Plan](docs/00-project-plan.md)
- [Requirements](docs/01-requirements.md)
- [Architecture](docs/02-architecture.md)
- [Implementation](docs/03-implementation.md)
- [Test Plan](docs/04-test-plan.md)
- [Test Report](docs/05-test-report.md)
- [Deployment](docs/06-deployment.md)
- [Summary](docs/99-summary.md)

## Tech Stack

- **Language**: Go 1.21
- **Architecture**: CLI with in-memory state
- **Concurrency**: Goroutines + Mutex
- **Testing**: Go testing package

---

## FeedMe Software Engineer Take Home Assignment

This project implements the McDonald order management system as a take-home assignment.

### Situation

McDonald is transforming their business during COVID-19. They wish to build the automated cooking bots to reduce workforce and increase their efficiency. As one of the software engineer in the project. You task is to create an order controller which handle the order control flow.

### User Story

1. As McDonald's normal customer, after I submitted my order, I wish to see my order flow into "PENDING" area. After the cooking bot process my order, I want to see it flow into to "COMPLETE" area.
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer. However if there's existing order from VIP member, my order should queue behind his/her order.
3. As McDonald's manager, I want to increase or decrease number of cooking bot available in my restaurant. When I increase a bot, it should immediately process any pending order. When I decrease a bot, the processing order should remain un-process.
4. As McDonald bot, it can only pickup and process 1 order at a time, each order required 10 seconds to complete process.

### Requirements

1. When "New Normal Order" clicked, a new order should show up "PENDING" Area.
2. When "New VIP Order" clicked, a new order should show up in "PENDING" Area. It should place in-front of all existing "Normal" order but behind of all existing "VIP" order.
3. The order number should be unique and increasing.
4. When "+ Bot" clicked, a bot should be created and start processing the order inside "PENDING" area. after 10 seconds picking up the order, the order should move to "COMPLETE" area. Then the bot should start processing another order if there is any left in "PENDING" area.
5. If there is no more order in the "PENDING" area, the bot should become IDLE until a new order come in.
6. When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order should return to its original position in the "PENDING" area (maintaining VIP/Normal order priority).
7. No data persistance is needed for this prototype, you may perform all the process inside memory.

### Submission Requirements

- Fork this repository and implement your solution
- Backend implementation in Go or Node.js
- Follow GitHub Flow process with Pull Request submission
- All tests in `test.sh` must pass
- The `result.txt` file must contain meaningful output from CLI application
- All output must include timestamps in `HH:MM:SS` format
- Submit a Pull Request and ensure the `backend-verify-result` workflow passes
