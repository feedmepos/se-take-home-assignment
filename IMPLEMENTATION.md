# Implementation Documentation

## Tech Stack
- **Language:** TypeScript (Node.js)
- **Testing:** Jest
- **Runtime:** ts-node

## Architecture

```
src/
├── cli.ts                # Interactive CLI
├── demo.ts               # Automated demo script
├── types.ts              # Enums: OrderType, OrderStatus, OrderPriority
├── models/
│   ├── order.ts          # Order class (status, priority)
│   └── bot.ts            # Bot class (process, stop, destroy)
├── services/
│   ├── order-queue.ts    # Priority queue (VIP > Normal)
│   ├── bot-manager.ts    # Bot lifecycle management
│   └── order-controller.ts  # Main controller (facade)
└── utils/
    └── logger.ts         # Timestamp logger (HH:MM:SS)
```

## How to Run

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run interactive CLI
npm run cli

# Run automated demo
npm run demo

# Or use scripts (for GitHub Actions)
bash scripts/build.sh
bash scripts/test.sh
bash scripts/run.sh   # Output to scripts/result.txt
```

## Interactive CLI

The CLI provides a menu-driven interface for real-time control:

```
=== McDonald's Order Management System ===
1 - Create Normal Order
2 - Create VIP Order
3 - Add Bot
4 - Remove Bot
5 - Show Status
0 - Exit
```

- Logs are written to `output.log` (use `tail -f output.log` in another terminal to monitor)
- Enter `m` to show menu again

## Design Decisions

1. **Priority Queue** - VIP orders inserted before Normal orders using `findIndex`
2. **10-second Timer** - Each bot uses `setTimeout(10000)` to simulate cooking
3. **LIFO Bot Removal** - Newest bot removed first via `Array.pop()`
4. **Order Requeue** - When bot is destroyed, its order resets to PENDING and returns to queue
