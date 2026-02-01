# FeedMe Take Home Assignment - Backend

## Overview

This project is a **Node.js CLI simulation** of McDonald's automated cooking bots system.  
It demonstrates order management for normal and VIP customers and bot control for processing orders.

## Features

- Add new **Normal** and **VIP** orders.
  - VIP orders are processed **before Normal orders**, but queue behind existing VIPs.
- Add or remove **cooking bots** dynamically.
  - Bots process one order at a time (10 seconds per order).
  - If no orders are pending, bots become **IDLE**.
  - Removing a bot stops its current processing and returns the order to the queue.
- Orders are tracked with **timestamps** in `HH:MM:SS` format.
- All simulation results are written to `scripts/result.txt`.

## Project Structure

Key points:
- All core functions (`addOrder`, `addBot`, `processOrders`, `removeBot`, `reportFinalStatus`) are implemented inside `/orderSystem.js`.
- For simplicity, the main driver code (`/index.js`) contains a hardcoded simulation of orders and bots.
- Unit tests for each function are included under `/tests/` and run using Node.js `assert` module.
- No external test dependencies are required; all tests use built-in assertion and file system modules.
- Tests cover normal/VIP orders, bot behavior, order processing, idle logging, removal, and final status reporting.
- Logs are written to `scripts/result.txt` to verify correct operation.

```
se-take-home-assignment/
├── index.js           # Main simulation CLI
├── orderSystem.js     # Main logic of the order system
├── package.json
├── scripts/
│   ├── test.sh        # Unit test execution
│   ├── build.sh       # Build script
│   ├── run.sh         # Run script
│   └── result.txt     # CLI output
├── tests/        	   # Contains all unit tests
│   ├── addBot.test.js        # Unit test cases of addBot() function
│   ├── addOrder.test.js      # Unit test cases of addOrder() function
│   ├── processOrder.test.js  # Unit test cases of processOrder() function
│   ├── removeBot.test.js     # Unit test cases of removeBot() function
│   └── reportFinalStatus.test.js		# Unit test cases of reportFinalStatus() function
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v22.x
- Git

### Run the Simulation

Run the CLI simulation using
```./scripts/run.sh```

Or run directly using
```node index.js```

### Check results
```cat scripts/result.txt```

### Test
```./scripts/test.sh```
This sh file runs all the test cases inside the `/tests` folder
All unit cases uses assertion to avoid extra external dependencies.

### Example Simulation Flow
1. **Initial orders in the queue:**
- Normal Order #1001  
- VIP Order #1002  
2. **Queue state (`pendingOrders` array):**  
- `[VIP #1002, Normal #1001]`
> VIP orders are always ahead of Normal orders.
3. **Adding a new VIP order (#1003):**
- Queued **behind existing VIP orders** but **before Normal orders**.  
- **Queue after adding:** `[VIP #1002, VIP #1003, Normal #1001]`
4. **Bots processing orders:**
- Bots pick orders from the **front of the queue**.
- VIP orders are processed first, then Normal orders.

**Example processing:**  
Bot #1 picks VIP #1002 → PROCESSING
Bot #2 picks VIP #1003 → PROCESSING
Remaining queue: [Normal #1001]

5. **Completing and removing orders:**
- After processing, orders become `COMPLETE` and move to `completedOrders`.
- If a bot is removed while processing, its current order returns to the **front of the pending queue** for other bots to pick.
