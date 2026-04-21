# McDonald's Order Controller — Project Overview

This document describes the **background, architecture, local execution, shell scripts, and CI** for this repository.

---

## 1. Overview

In-memory simulation of **automated cooking bots** for order scheduling:

- **Pending**: Orders queue with **VIP first**, then **normal**, each segment ordered by **order id** (creation order).
- **Processing**: Each bot handles **one order at a time**; default **10 seconds** per order.
- **Completed**: Finished orders are appended to a completed list.
- **Manager actions**: **Add bot** → immediately pulls from pending if any; **remove bot** → destroys the **newest** bot — if it was cooking, the timer is cancelled and the order is **re-inserted** into pending using the same VIP/normal rules.

No database or persistence; all state lives in the process.

---

## 2. Tech stack

| Item | Notes |
|------|--------|
| Runtime | **Node.js** (CI uses **22.x** — see `.github/workflows/backend-verify-result.yaml`) |
| Tests | Node built-in `node:test`, **no extra npm dependencies** |
| Modules | CommonJS (`require` / `module.exports`) |

---

## 3. Directory layout

```
├── src/
│   ├── order-controller.js   # Core: queues, bots, timers
│   └── main.js               # CLI entry: scripted demo + timestamped logs
├── test/
│   └── order-controller.test.js
├── scripts/
│   ├── test.sh               # Run unit tests (local / CI)
│   ├── build.sh              # Build placeholder (no compile artifact)
│   ├── run.sh                # Run CLI; redirect stdout to result.txt
│   └── result.txt            # CLI output (HH:MM:SS for CI checks)
├── doc/
│   └── PROJECT.md            # This file
├── package.json
└── .github/workflows/
    └── backend-verify-result.yaml
```

---

## 4. Architecture

### 4.1 Module roles

| Module | Role |
|--------|------|
| **`OrderController`** (`order-controller.js`) | Holds `pendingOrders`, `completedOrders`, `bots`; exposes `createOrder`, `addBot`, `removeBot`; internal `_insertPending`, `_assignPendingOrders`, `_tryAssign`, `_completeOrder`. |
| **`main.js`** | Builds a **demo timeline** (orders → add bots → `sleep` → VIP → `sleep` → remove bot), subscribes to controller `log` events, prints **`[HH:MM:SS]`** lines for `result.txt`. |

### 4.2 Data structures

- **Pending queue**: A **sorted array** — VIP segment first (by id), then normal segment (by id). Satisfies “new VIP after older VIPs, before all normals”.
- **Dequeue**: `shift()` from the front — global priority preserved.
- **Bots**: Array in **creation order**; **`pop()`** removes the **newest** bot.
- **10s processing**: `setTimeout`; on bot removal, **`clearTimeout`** — incomplete orders never reach completed; **`_insertPending`** re-queues them.

### 4.3 Events vs output

The controller emits `log` strings via `EventEmitter`; `main.js` adds timestamps and prints to stdout — domain logic stays separate from formatting, which helps if you add another CLI layer or logging later.

---

## 5. Running locally

### 5.1 Prerequisites

- **Node.js** installed (recommended **22.x** to match CI).
- Clone the repo and `cd` to the project root.

### 5.2 npm scripts

```bash
npm test
```

Runs: `node --test test/*.test.js`

```bash
npm start
```

Runs: `node src/main.js` (waits ~**22+ seconds** because of `sleep` in the demo)

### 5.3 Direct Node

```bash
node src/main.js
```

### 5.4 Windows notes

- You can use **PowerShell** if Git Bash / WSL is not installed.
- When redirecting to `scripts/result.txt`, watch **console encoding**; **Linux/macOS** + `bash scripts/run.sh` matches CI most closely.

---

## 6. Shell scripts (`scripts/`)

The repo provides **`test.sh`**, **`build.sh`**, and **`run.sh`** under **`scripts/`** (same layout as GitHub Actions).

| Script | Purpose |
|--------|---------|
| **`test.sh`** | `cd` to repo root, run `node --test test/*.test.js` |
| **`build.sh`** | No compiler output; placeholder “build” step for the pipeline |
| **`run.sh`** | Run `node src/main.js`, write stdout to **`scripts/result.txt`**, then `cat` it |

On **Linux / macOS / Git Bash**:

```bash
chmod +x scripts/test.sh scripts/build.sh scripts/run.sh
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

---

## 7. `result.txt` and CI

- **`run.sh`** redirects CLI stdout to **`scripts/result.txt`**.
- Log lines include **`[HH:MM:SS]`** so completion intervals (~10s per order) are visible.
- **GitHub Actions** workflow **`backend-verify-result`** (see `.github/workflows/backend-verify-result.yaml`) runs the three scripts in order and checks that `scripts/result.txt` exists, is non-empty, and contains a valid time pattern.

Before merging, confirm this workflow passes locally or on the PR.

---

## 8. Tests

- Cover order creation, VIP ordering, bot pickup, sequential processing, parallel bots, bot removal with re-queue and timer cancellation.
- **`mock.timers`** advances time — no real 10-second waits in tests.

---

## 9. Other references

- Assignment / repo intro: root **`README.md`**
- License: **`LICENSE`**
