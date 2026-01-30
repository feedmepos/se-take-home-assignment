# McDonald's Order Management System

This repository contains a solution for the **FeedMe POS – Software Engineer Take‑Home Assignment**.

The system simulates McDonald's order processing with **VIP priority**, **FIFO ordering**, and **bot‑based processing**, implemented with **NestJS (TypeScript)** and an optional **React frontend**.

---

## 🧩 Features

### Core Requirements

- VIP orders are always processed before NORMAL orders
- FIFO ordering within the same order type (by `createdAt`)
- Multiple bots can process orders concurrently
- Bots can be dynamically added or removed
- If a bot is removed while processing, the order safely returns to `PENDING`
- Orders move through states: `PENDING → PROCESSING → COMPLETE`

### Optional Features

- RESTful API mode (in addition to CLI simulation)
- Aggregated `/state` endpoint for frontend consumption
- React frontend UI with polling‑based updates
- Clear module separation and unit test coverage ≥ 80%

---

## 🏗 Architecture Overview

The backend is designed with **clear separation of concerns**:

- **OrderService** – manages order lifecycle and priority queues
- **BotManagerService** – manages bot lifecycle and scheduling
- **SimulationService** – drives deterministic CLI scenarios
- **Controllers** – thin REST layer for API mode only

Business logic is reused across **CLI simulation** and **REST API** without duplication.

---

## ▶️ How to Run

### Backend

The backend supports **two execution modes**.

#### 1️⃣ CLI Simulation (Primary – Assignment Requirement)

### Using provided script (recommended)
```bash
sh scripts/run-cli.sh
```

```bash
npm install
npm run start:cli
```

This runs a deterministic simulation and prints logs similar to `result.txt`.

---

#### 2️⃣ REST API Server

### Using provided script (recommended)
```bash
sh scripts/run-api.sh
```

```bash
npm install
npm run start:api
```

The API runs on:

```
http://localhost:3000
```

Available endpoints:

- `POST /orders` – create order (`{ type: "VIP" | "NORMAL" }`)
- `POST /bots` – add bot
- `DELETE /bots` – remove newest bot
- `GET /state` – aggregated system state

---

### Frontend

The frontend is a **React + Vite** application that consumes the REST API using **polling**.

```bash
cd frontend
npm install
npm run dev
```

Environment variable:

```env
VITE_API_URL=http://localhost:3000
```

---

## 🧪 Testing

Unit tests are provided for:

- Services (`OrderService`, `BotManagerService`)
- Controllers (`OrderController`, `BotController`, `StateController`)
- Simulation flow (`SimulationService`)

Test coverage is enforced at **80%+ globally**.

### Using provided script (recommended)
```bash
sh scripts/test.sh
```

```bash
npm test -- --coverage
```

Boilerplate files such as `main.ts`, `*.module.ts` are excluded from coverage by design.

---

## 📂 Project Structure

```text
src/
├── app.module.ts
├── main.cli.ts        # CLI simulation entry
├── main.api.ts        # REST API entry
│
├── order/             # Order domain logic
├── bot/               # Bot scheduling logic
├── simulation/        # CLI simulation
├── state/             # Aggregated API state
├── logger/            # Logging abstraction
└── frontend/          # React UI
```

---

## 🧠 Design Decisions

- **CLI first**: The core requirement is fulfilled via a CLI‑based simulation using `createApplicationContext`
- **Stateless REST API**: Added as a additional without affecting CLI behavior
- **Polling over SSE/WebSockets**: Chosen for simplicity, scalability, and reliability
- **Single source of truth**: Backend owns all state; frontend is a pure renderer

---

## 🔀 GitHub Flow

- Work is done on a feature branch
- A Pull Request is opened against:
  ```
  github.com/feedmepos/se-take-home-assignment
  ```
- All GitHub Actions checks pass before review

---

## ✅ Assignment Status

- [x] Core requirements implemented
- [x] Edge cases handled
- [x] Unit tests added
- [x] Optional REST API
- [x] Optional frontend UI

---

Thank you for reviewing this submission 🙏

