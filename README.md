# 🍔 McDonald's Order Management System

This repository contains a **technical take-home assignment** that simulates a McDonald’s order management system with **VIP priority**, **FIFO scheduling**, and **bot-based order processing**.

The solution is implemented in **NestJS (TypeScript)** and demonstrates all required behaviors using a **deterministic CLI simulation**.

---

## ✨ Features

### 🧾 Orders
- Types: `VIP`, `NORMAL`
- Status flow: `PENDING → PROCESSING → COMPLETE`
- Orders are processed fairly using FIFO (`createdAt`) rules

### 🤖 Bots
- Each bot processes **one order at a time**
- Orders take **10 seconds** to complete
- Bots can be added or removed dynamically
- Removing a bot safely stops processing and re-queues the order

### ⚡ Scheduling Rules
- VIP orders always have priority over NORMAL orders
- FIFO ordering is preserved within the same priority
- Interrupted orders resume based on original creation time

---

## ✅ Assignment Requirements Coverage

This implementation explicitly demonstrates:

- VIP priority over NORMAL orders
- Concurrent bot processing
- Bot removal during processing
- Safe order re-queuing
- Deterministic and reproducible behavior

---

## 🧪 CLI Simulation

A deterministic CLI simulation (`SimulationService`) is used to validate all behaviors.

### Example Output (Aligned with Provided `result.txt`)
```
McDonald's Order Management System - Simulation Results

[14:32:01] System initialized with 0 bots
[14:32:01] Created NORMAL Order #1 - Status: PENDING
[14:32:02] Created VIP Order #2 - Status: PENDING
[14:32:03] Bot #1 created - Status: IDLE
[14:32:03] Bot #1 picked up VIP Order #2 - Status: PROCESSING
...
Final Status:
- Total Orders Processed: 4 (2 VIP, 2 NORMAL)
- Orders Completed: 4
- Active Bots: 1
- Pending Orders: 0
```

The simulation validates:
- VIP priority
- FIFO ordering
- Bot removal during processing
- Correct order re-queuing

---

## ▶️ How to Run

### Using provided script (recommended)
```bash
sh scripts/run.sh
sh scripts/build.sh
sh scripts/test.sh
```

The script runs the CLI simulation end-to-end and mirrors the expected `result.txt` output.

### Manual run

### Install dependencies
```bash
npm install
```

### Run the CLI simulation
```bash
npm run start
```

The simulation output will be printed directly to the console.

---

## 🧪 Tests

Unit tests verify:
- Order creation sequence
- Bot lifecycle behavior
- Scheduling triggers
- Final system summary

### Using provided script (recommended)
```bash
sh scripts/test.sh
```

### Manual run

Run tests with:
```bash
npm run test
```

All GitHub Actions checks should pass successfully ✅.

---

## 🙏 Thank You

Thank you for reviewing this submission.  
I’m happy to walk through the design decisions, trade-offs, or potential extensions during the next interview round.
