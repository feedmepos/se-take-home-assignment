# McDonald's Order Controller (Frontend)

React + Vite + TypeScript implementation of the FeedMe take-home assignment.

## Features

- Create **Normal** and **VIP** orders with priority queuing
- Add and remove cooking bots dynamically
- Visual **Pending**, **Processing**, and **Complete** areas
- 10-second bot processing with progress bar and countdown
- Timestamped event log for every system action

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

**Live demo:** https://huanglotus.github.io/se-take-home-assignment/

## Scripts

```bash
npm run dev      # Start local dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Run unit tests
```

## Deployment

This app can be deployed to any static hosting platform:

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- GitHub Pages

Example with Vercel:

1. Push this repository to GitHub
2. Import the project in Vercel
3. Set the root directory to `frontend`
4. Build command: `npm run build`
5. Output directory: `dist`

## Architecture

- `src/domain/` — pure business logic (queue, bot manager, order controller)
- `src/hooks/useOrderSystem.ts` — React state + timers
- `src/components/` — UI components

Domain logic is framework-agnostic and covered by Vitest unit tests.

## Manual Test Checklist

1. Click **New Normal Order** → order appears in Pending
2. Click **New VIP Order** → VIP order appears before normal orders
3. Order IDs increase sequentially starting from `1001`
4. Click **+ Bot** → bot picks up highest-priority pending order
5. After 10 seconds → order moves to Complete
6. With no pending orders → bot shows IDLE
7. Click **- Bot** → newest bot removed; in-progress order returns to Pending
