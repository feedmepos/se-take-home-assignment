# Order Controller — Frontend

A live React UI for the McDonald's order controller. It renders the **PENDING** and
**COMPLETE** areas, the cooking **bots** (each with its in-progress order and a live
countdown), and the four manager controls — **New Normal**, **New VIP**, **+ Bot**,
**− Bot** — demonstrating every requirement in the [root README](../README.md).

## Architecture

The UI is a **pure projection of server state**. It holds no business state of its own:

- **One `EventSource`** (`src/hooks/useEventSource.ts`) connects to `GET /api/events`.
  The server pushes a **complete `StatusDTO` snapshot** on connect and on every change,
  so the client **replaces** its state wholesale on each frame — no patching, no merge
  logic, no risk of drift. The hook is the single seam that touches `EventSource`, and a
  fake is injected in tests (jsdom has no `EventSource`).
- **Commands** (`src/api/client.ts`) are fire-and-forget `POST`/`DELETE` calls to `/api`.
  Buttons never mutate local state — the UI only changes when the next SSE snapshot
  arrives.
- **Wire types** (`OrderDTO`, `BotDTO`, `StatusDTO`, …) are imported from the backend's
  `backend/src/contracts.ts` via the `@contracts` Vite alias — one source of truth, no
  duplication (see [ADR 0006](../docs/adr/0006-contracts-in-backend-tsc-build.md)).
- **Countdown** (`src/components/Countdown.tsx`) computes `startedAt + cookDurationMs −
  now`; `cookDurationMs` comes from the snapshot (the backend's source of truth), not a
  hardcoded constant.

State management is a single `useState<StatusDTO | null>` inside the hook — full-replace
makes a reducer unnecessary. No Redux/Zustand/React-Query.

## Stack

React 19 · TypeScript (strict) · Vite 8 · Vitest + React Testing Library · Tailwind 4 +
DaisyUI 5. No heavy UI framework; styling is DaisyUI component classes.

## Develop

```bash
npm install
npm run dev      # Vite dev server on :5173, proxies /api -> http://localhost:3000
```

Run the backend (`cd ../backend && npm start`) in parallel so `/api` and the SSE stream
resolve.

## Test

```bash
npm test         # vitest run — hook, client, components, and App integration tests
```

Component and integration tests assert **behavior** (roles, text, accessible names),
never CSS classes. The App integration test drives the full SSE → render → click →
update → reconnect path through the injected fake `EventSource` and a mocked `fetch`.

## Build & serve (production)

```bash
npm run build    # tsc -b && vite build -> frontend/dist
```

The output goes to `frontend/dist/`, which the backend's
`ServeStaticModule` serves on all non-`/api` routes. In production the **backend serves
the API, the SSE stream, and this SPA from one origin** — no CORS, one URL (see the
[architecture doc §8](../docs/architecture.md)).
