# Frontend — McDonald's Order Controller (Vue 3 + Ant Design Vue)

A single-page UI that demonstrates every requirement: create normal/VIP orders,
add/remove cooking bots, and watch orders flow PENDING → (bot cooking) →
COMPLETE in real time.

## Stack

- Vue 3 (`<script setup>`)
- Ant Design Vue 4 (`a-card`, `a-button`, `a-tag`, `a-progress`, `a-statistic`, …)
- Vite

## Run

The UI talks to the Node.js backend, so start that first:

```bash
# terminal 1 — backend
cd ../backend
npm install
PROCESS_MS=10000 npm run server   # http://localhost:3001

# terminal 2 — frontend
npm install
npm run dev                       # http://localhost:5173
```

> Tip: for a snappier demo use a shorter cook time, e.g. `PROCESS_MS=3000 npm run server`.

### Backend URL

Defaults to `http://localhost:3001`. Override when building/serving:

```bash
VITE_API_BASE=https://your-api.example.com npm run build
```

## How it works

- On mount it opens an **SSE** connection to `/api/events`; the backend pushes a
  fresh state snapshot on every change, so the three columns stay live without
  polling.
- Buttons call the REST endpoints (`POST /api/orders`, `POST /api/bots`,
  `DELETE /api/bots`).
- Each processing bot shows a progress bar and a seconds-remaining countdown,
  animated client-side from the moment the bot picks up an order.

## UI map to requirements

| UI element | Requirement |
|---|---|
| **+ New Normal Order** / **+ New VIP Order** | Orders appear in PENDING; VIP sits ahead of normal, behind earlier VIPs. |
| **PENDING** column | Live queue with VIP (gold) / NORMAL (blue) tags. |
| **COOKING BOTS** column | Per-bot status, current order, progress + countdown. |
| **COMPLETE** column | Finished orders with a ✓. |
| **+ Bot / - Bot** | Scale bots up/down; removing a busy bot returns its order to PENDING. |

## Build & deploy

```bash
npm run build     # outputs static site to dist/
```

`dist/` is a static bundle deployable to Netlify, Vercel, GitHub Pages, S3, etc.
Remember to point `VITE_API_BASE` at a publicly reachable backend.
