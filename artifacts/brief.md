# Brief: McDonald's Automated Order Controller (Frontend)

## Problem Statement

McDonald's is automating kitchens during COVID-19 with cooking bots. Customers and managers need a visual Kitchen Display System (KDS) to track orders through PENDING → PROCESSING → COMPLETE lifecycle, enforce VIP order priority, and manage bot count in real time — all from a single browser-based dashboard.

## Target Users / Personas

- **McDonald's Customer (Normal)** — submits an order, watches it enter the PENDING queue and eventually move to COMPLETE. Expects first-in-first-out within their tier.
- **McDonald's VIP Member** — same as above, but expects their orders to jump to the front of the queue (behind only other VIPs).
- **McDonald's Manager** — controls cooking bot capacity (+/-), sees all orders and bot states at a glance, and expects immediate system response to capacity changes.

## Top User Journeys

### Journey 1: Normal Customer Places Order
1. User clicks **"New Normal Order"** button
2. A new order ticket appears at the bottom of the **PENDING** column with a unique, incrementing order number
3. If a bot is idle, the order is picked up immediately; otherwise it waits its turn
4. When a bot picks it up, the ticket shows a **progress bar** counting down from 10s
5. After 10s, the ticket moves to the **COMPLETE** column and persists there

### Journey 2: VIP Gets Priority
1. Several Normal orders (#1001, #1003) are already in PENDING
2. User clicks **"New VIP Order"** — ticket #1004 appears in PENDING
3. It is placed **after** existing VIP orders but **before** all Normal orders
4. When the next bot becomes available, #1004 is picked up before the waiting Normal orders
5. Order processes and moves to COMPLETE

### Journey 3: Manager Adjusts Bot Capacity
1. Page shows current bot count (initially 0)
2. Manager clicks **"+ Bot"** — a new bot spawns and immediately picks up the highest-priority PENDING order
3. Existing bots continue processing; the new bot grabs anything waiting
4. Manager clicks **"- Bot"** — the newest bot is destroyed
5. If that bot was mid-processing, its order **returns to PENDING** at its original priority position (VIP orders stay ahead of Normal); the progress resets
6. Bot status indicators update to reflect current count and per-bot state

## Non-Goals (What We Are NOT Building)

- **No data persistence** — all state is in-memory (Next.js server-side state or React state); refreshes reset everything
- **No authentication or login** — no customer/manager distinction; the UI is a single combined dashboard for demo purposes
- **No real backend API or database** — no REST endpoints, no PostgreSQL. All logic runs in the Next.js server (API routes or server components)
- **No multi-user or WebSocket sync** — single browser session only; no real-time sync across multiple terminals
- **No mobile responsiveness** — desktop-optimized layout only
- **No internationalization (i18n)** — English only
- **No accessibility compliance** — not required for the prototype

## Known Constraints

| Constraint | Detail |
|-----------|--------|
| **Tech stack** | Next.js (App Router or Pages Router — TBD in PRD), React, CSS (Tailwind or CSS Modules — TBD) |
| **Deployment** | Vercel (free tier), publicly accessible URL |
| **Time** | ~1 hour implementation target; do not over-engineer |
| **State model** | In-memory only; no database or external storage |
| **Processing time** | Fixed 10 seconds per order per bot |
| **Order priority** | VIP orders always before Normal orders; FIFO within each tier |
| **Bot lifecycle** | +Bot creates newest; -Bot destroys newest; destroyed bot's in-progress order returns to PENDING at original priority |
| **Existing code** | Placeholder scripts (`build.sh`, `test.sh`, `run.sh`) exist for backend path — **not relevant for frontend path** |
| **GitHub Actions** | Not required for frontend path (only backend must pass CI) |
