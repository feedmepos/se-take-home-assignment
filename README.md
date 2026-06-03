# McDonald's Order System

McDonald is transforming their business during COVID-19. They wish to build the automated cooking bots to reduce workforce and increase their efficiency. Therefore, a application is created on browser-based simulation of a fast-food order kitchen: enqueue normal and VIP orders, assign them to cooking bots, and track progress from pending through completed.

**Developed by Jack Tiew**

---

## Table of contents

- [Project overview](#project-overview)
- [Features](#features)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [How to compile and run](#how-to-compile-and-run)
- [Available scripts](#available-scripts)

---

## Project overview

This application is a **Software Engineer take-home assignment** built as a single-page React app. It models a simplified McDonald's-style kitchen:

- Staff can place **Normal** or **VIP** orders.
- **Cooking bots** pull work from a shared pending queue and cook each order for a fixed duration (10 seconds).
- The UI shows three live columns: **Pending**, **Cooking Bots**, and **Completed**.

All state lives in memory in the browser. Refreshing the page resets orders and bots. There is no backend, database, or persistence layer.

---

## Features

- **Order types** — Normal and VIP orders with distinct badges and enqueue rules.
- **VIP priority** — VIP orders are served before normal orders. New VIPs are inserted after existing VIPs and before any normals.
- **Cooking bots** — Add or remove bots (removal affects the most recently added bot). Idle bots automatically pick up the next pending order.
- **Fixed cook time** — Each order takes 10 seconds (`PROCESS_TIME_MS`). Progress bars and countdowns use the same constant.
- **Bot removal handling** — If a bot is removed while cooking, its order returns to the pending queue with correct VIP/normal placement.
- **Live header clock** — Current date and time in the header.

---

## How it works

### State management

Business logic is centralized in a custom React hook, [`src/hooks/useOrderController.js`](src/hooks/useOrderController.js). It uses:

- **`useState`** — Single in-memory store: orders map, pending queue, completed queue, and bot list.
- **`useRef`** — Cooking timers (`setTimeout`) and a stable reference for recursive completion callbacks.
- **Pure helpers** — Queue insertion, bot assignment, order completion, and restore-on-bot-remove.

This is **local React state** (not Redux, Zustand, or a server cache like Redis).

### Order flow

1. User clicks **Normal** or **VIP** → order is created and added to `pendingQueue`.
2. Any **idle bot** takes the front of `pendingQueue` (VIPs are always ahead of normals).
3. After **10 seconds**, the order moves to **Completed** and the bot becomes idle again.
4. Idle bots immediately try to take the next pending order.

### UI layout

| Area             | Role                                                   |
| ---------------- | ------------------------------------------------------ |
| Header           | Branding and live date/time                            |
| Action bar       | New order buttons, active bot controls, cook-time info |
| Pending column   | Orders waiting for a bot                               |
| Cooking column   | Bots and in-progress orders with progress              |
| Completed column | Finished orders                                        |

---

## Project structure

```
src/
├── pages/
│   ├── App.jsx          # Root layout and hook wiring
│   └── App.css
├── hooks/
│   ├── useOrderController.js   # Core domain logic
│   ├── useLiveClock.js
│   └── useNowTick.js
├── utils/
│   ├── cookingProgress.js      # Progress % and seconds remaining
│   └── orderTime.js            # Time formatting
├── components/
│   ├── Header/
│   ├── Actions/                # Action bar, new orders, bots, cook time
│   └── Orders/
│       ├── Pending/
│       ├── Cooking/
│       └── Completed/
└── assets/                     # PNG icons and SVGs (via vite-plugin-svgr)
```

---

## Tech stack

| Category          | Library                                                                             | Version (installed) |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------- |
| UI                | [React](https://react.dev/)                                                         | 19.2.7              |
| DOM               | [react-dom](https://react.dev/)                                                     | 19.2.7              |
| Build tool        | [Vite](https://vite.dev/)                                                           | 8.0.16              |
| React in Vite     | [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)                 | 6.0.2               |
| SVG as components | [vite-plugin-svgr](https://github.com/vitejs/vite-plugin-svgr)                      | 5.2.0               |
| Linting           | [ESLint](https://eslint.org/)                                                       | 10.3.0              |
| ESLint configs    | `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@eslint/js`, `globals` | See `package.json`  |
| Types (dev)       | `@types/react`, `@types/react-dom`                                                  | 19.x                |

**Runtime:** Modern evergreen browser with ES modules support.

**Language:** JavaScript (JSX), no TypeScript application code.

---

## Prerequisites

- **Node.js** 20+ recommended (18+ should work with Vite 8)
- **npm** (comes with Node.js)

---

## How to compile and run

### 1. Install dependencies

From the project root:

```bash
npm install
```

### 2. Run in development (hot reload)

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### 3. Production build (compile)

```bash
npm run build
```

Output is written to the `dist/` folder.

### 4. Preview the production build locally

```bash
npm run preview
```

Serves the compiled `dist/` app for a quick smoke test before deployment.

### 5. Lint (optional)

```bash
npm run lint
```

---

## Available scripts

| Script    | Command           | Description                    |
| --------- | ----------------- | ------------------------------ |
| `dev`     | `npm run dev`     | Start Vite dev server with HMR |
| `build`   | `npm run build`   | Production build to `dist/`    |
| `preview` | `npm run preview` | Serve `dist/` locally          |
| `lint`    | `npm run lint`    | Run ESLint on the project      |

---

## Notes for reviewers

- **VIP queue rule:** Pending queue order is always “all VIPs first (FIFO among VIPs), then all normals (FIFO among normals).”
- **No bot cap:** You can add as many bots as needed; the UI shows active vs total bots.
- **Timers:** Cooking completion uses `setTimeout` per bot; timers are cleared on unmount and when a bot is removed.
