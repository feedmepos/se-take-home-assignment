# McDonald Order Controller (Frontend Prototype)

A standalone frontend simulation of an in-store order controller used to model queueing and cooking bot behavior.

This project is intentionally in-memory only (no backend, no API, no persistence) and is designed for fast manual testing of order flow logic.

Live demo: `[Demo site](https://frontend-mdkitchen-keith.vercel.app/)`

## Features
- Create `Normal` and `VIP` orders.
- Maintain priority queue behavior:
  - `VIP` orders always come before `Normal` orders.
  - Within the same type, lower order number is processed first.
- Add or remove bots dynamically.
- Each bot can process only one order at a time.
- Each order takes exactly `10 seconds` to complete.
- If a processing bot is removed, its current order is returned to the pending queue in the correct position.
- Live processing countdown per bot.
- Completed order timestamp (`HH:MM:SS`).
- Role-based action tabs for UX clarity:
  - `Customer`
  - `VIP Member`
  - `Manager`

## Tech Stack
- React 19
- TypeScript
- Vite
- Tailwind CSS 4

## Project Structure
```text
src/
  App.tsx                         # Main state + reducer + page composition
  types.ts                        # Shared app types and action definitions
  components/
    ActionPanel.tsx               # Role-based action buttons
    RoleTabs.tsx                  # Customer / VIP / Manager tabs
    icons/
      UiIcons.tsx                 # Inline SVG icon set
```

## How the Logic Works

### State model
The app uses a single reducer-based state:
- `pendingOrders`
- `completedOrders`
- `bots`
- incremental counters for order and bot IDs

### Queueing strategy
Orders are inserted with deterministic sorting:
1. Priority rank (`VIP` before `NORMAL`)
2. Order ID ascending

This guarantees stable behavior when orders are reinserted (for example, when removing a processing bot).

### Bot processing
- Idle bots pull from pending queue immediately when work is available.
- Processing is time-based and checked via periodic ticks (`PROCESS_TICK`) using wall-clock time.
- This avoids background-tab timer issues (e.g. browser throttling when alt-tabbed).

### No persistence by design
All data exists only in memory for prototype speed and clarity.

## Getting Started

### Prerequisites
- Node.js 20+ (recommended)
- npm 10+ (recommended)

### Install
```bash
npm install
```

### Run locally
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

Build output is generated under `dist/`.

## Manual Test Checklist
1. Create several `Normal` orders and verify ascending order numbers.
2. Create `VIP` orders and verify they queue ahead of normals.
3. Add bots and verify immediate processing start.
4. Verify each processing order completes in ~10 seconds.
5. Remove a processing bot and verify its order returns to pending at correct priority position.
6. Alt-tab away and back; verify processing still recovers and completes correctly.
7. Verify completed entries show completion time.

## Deployment
This is a static frontend app. Deploy the `dist/` output.

### Vercel
1. Import repository into Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.

### Netlify
1. Import repository into Netlify.
2. Build command: `npm run build`.
3. Publish directory: `dist`.

### GitHub Pages
1. Build with `npm run build`.
2. Publish `dist/` using GitHub Actions or a deployment branch.

## Notes for Contributors
- Keep the prototype simple; avoid adding backend/auth complexity.
- Preserve deterministic queue behavior when changing bot/order logic.
- Prefer small UI components and keep reducer logic centralized.
