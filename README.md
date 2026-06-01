# McDonald's Automated Order Management System

A priority-queue order controller where cooking **bots** process **VIP / Normal** orders concurrently. The same framework-agnostic domain core powers three surfaces: an interactive **CLI** (produces the CI `result.txt`), a **Fastify REST + WebSocket** backend, and a **React** kitchen dashboard.

> Full technical design: [`docs/specs/2026-06-01-order-management-design.md`](./docs/specs/2026-06-01-order-management-design.md) · Progress log: [`docs/PROGRESS.md`](./docs/PROGRESS.md)

## Highlights

- **Single source of truth** — all business rules live in `@feedme/core` (pure TypeScript, no framework/IO deps); backend, CLI and tests reuse it with zero logic duplication.
- **Deterministic tests** — a `Clock` abstraction lets `FakeClock` advance the 10s processing instantly, so the full lifecycle is verified in milliseconds. **Core coverage gate enforced at ≥ 90% (currently 100%).**
- **Backend-authoritative, thin client** — REST commands mutate state, WebSocket pushes a full snapshot after every event, so the UI never drifts.
- **Clean layering** — Domain → Application → Interface → Infrastructure.

## Requirement Coverage

| #   | Requirement                                             | Where                                                  |
| --- | ------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Normal order enters PENDING                             | `Kitchen.createOrder(NORMAL)`                          |
| 2   | VIP queues ahead of Normal, behind existing VIP         | `OrderQueue` (VIP segment + Normal segment, each FIFO) |
| 3   | Unique, increasing order numbers                        | monotonic counter in `Kitchen`                         |
| 4   | Bot processes 10s → COMPLETE → next                     | `Bot` + `Clock` timer, re-dispatch on finish           |
| 5   | Bot goes IDLE when queue empty                          | `Kitchen.dispatch()`                                   |
| 6   | Remove newest bot; in-flight order requeued in priority | `Kitchen.removeBot()` → `OrderQueue.requeue()`         |
| 7   | In-memory only, no persistence                          | object graph in `Kitchen`                              |

## Tech Stack

TypeScript (strict) · pnpm workspaces monorepo · Fastify + `@fastify/websocket` · React 18 + Vite + Zustand + TailwindCSS + framer-motion · Vitest + React Testing Library · ESLint + Prettier + Husky.

## Project Structure

```
se-take-home-assignment/
├── packages/
│   └── core/          # ★ Domain core (Order, Bot, OrderQueue, Kitchen, Clock) — framework-agnostic
├── apps/
│   ├── cli/           # Scenario simulation → scripts/result.txt (with HH:MM:SS timestamps)
│   ├── server/        # Fastify REST + WebSocket gateway over the core
│   └── web/           # React kitchen-command-center dashboard
├── scripts/           # test.sh / build.sh / run.sh + result.txt (CI contract)
└── docs/              # design spec + progress log
```

## Prerequisites

- Node.js **>= 20**
- pnpm **10.x** (`corepack enable && corepack prepare pnpm@10.10.0 --activate`)

## Getting Started

```bash
pnpm install          # install all workspace deps
pnpm -r build         # build every package (core must build first for cli/server/web types)
```

### Run the backend + web dashboard

```bash
pnpm --filter @feedme/server dev    # Fastify on http://localhost:3001 (PORT/HOST overridable)
pnpm --filter @feedme/web dev       # Vite dev server, talks to localhost:3001 by default
```

Then open the Vite URL printed in the terminal. The dashboard auto-connects over WebSocket and reflects every command in real time.

- Web reads `VITE_API_BASE` (defaults to `http://localhost:3001`); the WS URL is derived (`http→ws`, `https→wss`, path `/ws`). Production value lives in `apps/web/.env.production`.

### Run the CLI (generates result.txt)

```bash
pnpm --filter @feedme/cli build
pnpm cli > scripts/result.txt      # or: bash scripts/run.sh
```

`result.txt` logs the seeded scenario (VIP priority, concurrency, bot removal + requeue, completion stats) with `HH:MM:SS` timestamps, satisfying the `backend-verify-result` CI workflow.

## HTTP / WebSocket API

| Method   | Path          | Body                            | Effect                                                                  |
| -------- | ------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `GET`    | `/api/state`  | —                               | Full state snapshot                                                     |
| `POST`   | `/api/orders` | `{ "type": "NORMAL" \| "VIP" }` | Create order (invalid type → `400`)                                     |
| `POST`   | `/api/bots`   | —                               | Add a bot                                                               |
| `DELETE` | `/api/bots`   | —                               | Remove the newest bot                                                   |
| `GET`    | `/ws`         | —                               | WebSocket: pushes `STATE` on connect, then `EVENT` + `STATE` per change |

## Testing & Quality

```bash
pnpm -r test          # all unit/integration tests (core runs with coverage gate)
pnpm lint             # ESLint (flat config)
pnpm -r typecheck     # tsc --noEmit per package
pnpm format           # Prettier write
```

- **Tests:** core 46 (incl. coverage), cli, server (Fastify inject + real WS client), web (store/components).
- **Coverage gate:** `packages/core/vitest.config.ts` enforces 90% statements/branches/functions/lines on domain runtime code.
- **Git hooks:** Husky `pre-commit` runs `lint-staged` (eslint --fix + prettier on staged files) → `typecheck` → tests. Installed automatically via the `prepare` script on `pnpm install`.

### CI

`.github/workflows/backend-verify-result.yaml` runs `scripts/{test,build,run}.sh` and asserts `scripts/result.txt` is non-empty and contains `HH:MM:SS` timestamps.

## Deployment

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the BaoTa (宝塔) / Aliyun setup: static web on `demo.magicyyds.com`, Node backend on `api.demo.magicyyds.com` behind an Nginx reverse proxy with WebSocket upgrade headers + SSL.

---

## FeedMe Software Engineer Take Home Assignment

Below is a take home assignment before the interview of the position. You are required to

1. Understand the situation and use case. You may contact the interviewer for further clarification.
2. implement the requirement with **either frontend or backend components**.
3. Complete the requirement with **AI** if possible, but perform your own testing.
4. Provide documentation for the any part that you think is needed.
5. Bring the source code and functioning prototype to the interview session.

### Situation

McDonald is transforming their business during COVID-19. They wish to build the automated cooking bots to reduce workforce and increase their efficiency. As one of the software engineer in the project. You task is to create an order controller which handle the order control flow.

### User Story

As below is part of the user story:

1. As McDonald's normal customer, after I submitted my order, I wish to see my order flow into "PENDING" area. After the cooking bot process my order, I want to see it flow into to "COMPLETE" area.
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer. However if there's existing order from VIP member, my order should queue behind his/her order.
3. As McDonald's manager, I want to increase or decrease number of cooking bot available in my restaurant. When I increase a bot, it should immediately process any pending order. When I decrease a bot, the processing order should remain un-process.
4. As McDonald bot, it can only pickup and process 1 order at a time, each order required 10 seconds to complete process.

### Requirements

1. When "New Normal Order" clicked, a new order should show up "PENDING" Area.
2. When "New VIP Order" clicked, a new order should show up in "PENDING" Area. It should place in-front of all existing "Normal" order but behind of all existing "VIP" order.
3. The order number should be unique and increasing.
4. When "+ Bot" clicked, a bot should be created and start processing the order inside "PENDING" area. after 10 seconds picking up the order, the order should move to "COMPLETE" area. Then the bot should start processing another order if there is any left in "PENDING" area.
5. If there is no more order in the "PENDING" area, the bot should become IDLE until a new order come in.
6. When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order should return to its original position in the "PENDING" area (maintaining VIP/Normal order priority).
7. No data persistance is needed for this prototype, you may perform all the process inside memory.

### Functioning Prototype

You must implement **either** frontend or backend components as described below:

#### 1. Frontend

- You are free to use **any framework and programming language** of your choice
- The UI application must be compiled, deployed and hosted on any publicly accessible web platform
- Must provide a user interface that demonstrates all the requirements listed above
- Should allow users to interact with the McDonald's order management system

#### 2. Backend

- You must use **either Go (Golang) or Node.js** for the backend implementation
- The backend must be a CLI application that can be executed in GitHub Actions
- Must implement the following scripts in the `script` directory:
  - `test.sh`: Contains unit test execution steps
  - `build.sh`: Contains compilation steps for the CLI application
  - `run.sh`: Contains execution steps that run the CLI application
- The CLI application result must be printed to `result.txt`
- The `result.txt` output must include timestamps in `HH:MM:SS` format to track order completion times
- Must follow **GitHub Flow**: Create a Pull Request with your changes to this repository
- Ensure all GitHub Action checks pass successfully
- **Note**: An interactive CLI implementation is compulsory for the next round of interview. Candidates should be prepared to demonstrate interactive command handling.

#### Submission Requirements

- Fork this repository and implement your solution with either frontend or backend
- **Frontend option**: Deploy to a publicly accessible URL using any technology stack
- **Backend option**: Must be implemented in Go or Node.js and work within the GitHub Actions environment
  - Follow GitHub Flow process with Pull Request submission
  - All tests in `test.sh` must pass
  - The `result.txt` file must contain meaningful output from your CLI application
  - All output must include timestamps in `HH:MM:SS` format to track order completion times
  - Submit a Pull Request and ensure the `backend-verify-result` workflow passes
- Provide documentation for any part that you think is needed

### Tips on completing this task

- Testing, testing and testing. Make sure the prototype is functioning and meeting all the requirements.
- Utilize coding agent to complete the assignment scope your working hour within 1 hour, do not over engineer it. However, ensure you read and understand what your code doing and apply good engineering practice.
- Complete the implementation as clean as possible, clean code is a strong plus point, do not bring in all the fancy tech stuff.
