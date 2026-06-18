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
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer.  However if there's existing order from VIP member, my order should queue behind his/her order.
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

---

## Solution — Frontend (Next.js + TypeScript)

**Live demo:** [mcdonalds-order-bots-haikal.vercel.app](https://mcdonalds-order-bots-haikal.vercel.app/)  
**Author:** Haikal Azim · **Branch:** `feat/mcdonalds-order-controller-haikal`

### Quick start

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

### All gates

```bash
pnpm typecheck  # TS strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
pnpm lint       # Biome (format + lint)
pnpm test       # Vitest — 28 unit tests, all pure core
pnpm e2e        # Playwright — VIP-first happy path with clock control
pnpm build      # Next.js production build
```

---

### The queue invariant (the heart of the assignment)

PENDING is **always** kept sorted by a single composite key:

> **(VIP before NORMAL), then (ascending order id)**

Because order ids are monotonically assigned at creation time, this one rule satisfies every ordering requirement automatically:

| Scenario | Why it works |
|---|---|
| New Normal → back of queue | Highest id among Normals → sorts last |
| New VIP → ahead of all Normals | VIP tier outranks all Normals regardless of id |
| New VIP → behind existing VIPs | Higher id than earlier VIPs → sorts after them |
| `-Bot` returns order to original slot | `insertOrder` re-sorts by the same key; unchanged id → same position |

This is implemented in **`src/core/queue.ts`** as `compareOrders`. A new order tier or priority rule is a change to one function and nothing else.

---

### Architecture & design decisions

```
core (pure)  →  store (bridge)  →  components (presentation)
```

**`src/core/`** — Zero React / DOM / globals. Time is injected via `Scheduler` (default `systemScheduler` = `setTimeout`/`Date.now`), making the core unit-testable with `vi.useFakeTimers()` without any fake scheduler. Same core can back a CLI unchanged.

**`src/store/use-order-controller.ts`** — `useSyncExternalStore` bridge. One module-level `OrderController` singleton. Selector hooks (`usePendingOrders`, `useCompleteOrders`, `useBots`) let each column subscribe independently. `controllerActions` is a stable module-level object — never recreated.

**`src/components/countdown.tsx`** — Isolated ticking leaf. Its own `setInterval` reads `endsAt - Date.now()` every 200 ms. The board (pending/complete columns) **never re-renders** because a countdown ticks.

**Stable snapshots** — `getSnapshot()` returns the exact same object reference until `commit()` is called. `useSyncExternalStore` uses `Object.is` equality; a stable reference means no spurious re-renders on reads that don't follow a state change.

**`removeBot()` timer cancellation** — when a bot is removed mid-process, `scheduler.clearTimeout(handle)` is called before the order is re-inserted. The headline test advances 15 s past removal and asserts zero completions.

---

### AI-assisted workflow

This solution was built using Claude Code in **plan-mode** (`/plan`):

1. Read `PRD.md` and `CLAUDE.md`, then produced a full implementation plan before touching any code.
2. The plan dictated the Conventional Commit order (`core → tests → bridge → UI → docs`), the must-pass test list, and the architectural constraints.
3. Implementation ran in one pass on one branch (`feat/order-controller`), keeping every commit green.
4. Vitest and Playwright gates were run after each step; any failures were fixed before the next commit.

The AI handled scaffolding, boilerplate, and test-writing. Architecture decisions (injected Scheduler, stable snapshots, isolated countdown, single sort invariant) were derived from the spec and verified by reading the generated code before each commit.

---

### What I'd add next

- **Interactive CLI** on the same pure core (no React needed — the core is already framework-agnostic).
- **Configurable processing time** — expose `PROCESS_MS` as a constructor parameter.
- **Order cancellation** — customer-side; re-inserts to pending then re-assigns.
- **Bot failure / retry** — the timer callback would emit a `BotFailed` event, re-queue the order, and mark the bot as faulted.
- **Persistence** — serialise the snapshot to `localStorage`; restore on mount.
- **Real concurrency / locking** — irrelevant for in-memory single-thread JS, but documented for the interviewer.
