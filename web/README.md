# McDonald's order controller — web UI

Stack: **Next.js 15** (App Router), **React 19**, **TypeScript**, **Tailwind CSS**.

`next.config.ts` sets **`output: "export"`** so `npm run build` produces a static site in **`web/out`** (used by CI and static hosts).

## Requirements mapping

| Requirement | Where |
|-------------|--------|
| New normal / VIP orders | Buttons on `src/app/page.tsx` → `KitchenModel` |
| VIP after VIP, before normal | `vip` / `normal` queues + `dequeueHead` in `src/kitchen/` |
| Monotonic order ids | `nextOrderId` in `KitchenModel` |
| +/− bots, newest bot removed | `addBot` / `removeNewestBot` |
| 10s cook, 1 order per bot | `setTimeout` in `KitchenModel` (`processMs`, default 10_000) |
| Cancel cook returns to pending | `removeNewestBot` reinserts via `insertOrderAt` |
| Idle bots when queue empty | bots stay `IDLE` until new orders; `assignAllIdle` |

## Local run

From the **repository root** (npm workspaces — one `package-lock.json` at the root):

```bash
npm install
npm run dev
```

**CI note:** `scripts/test.sh` and `scripts/build.sh` run `npm ci`, which requires **`package-lock.json` at the repo root to be committed**. If GitHub Actions fails with “can only install with an existing package-lock.json”, add and push that file.

Then open the URL Next prints (usually `http://localhost:3000`).

Optional faster cooks while testing — create **`web/.env.local`**:

```bash
NEXT_PUBLIC_ORDER_PROCESS_MS=500
```

## Tests

```bash
# from repository root
npm run test
```

## Production build

```bash
# from repository root
npm run build
```

Output: **`web/out`** (static export).

## Public deploy

- **Vercel**: import the repo, set app root to repo root (or `web` if you configure the monorepo), use the default Next.js build (you can turn off static export if you want SSR later).
- **Netlify / GitHub Pages**: publish **`web/out`** after `npm run build` from the repo root.

The repository root `scripts/` targets are wired for CI (`test.sh` / `build.sh` / `run.sh`).
