# Architecture — McDonald's Order Controller

> Design spec. Companion to [`../CONTEXT.md`](../CONTEXT.md) (domain glossary) and [`adr/`](./adr) (decision records).
> Date: 2026-05-27.

## 1. Problem & scope

Build an order controller for automated cooking bots (see [CONTEXT.md](../CONTEXT.md)). We implement **both** a backend (the assignment's primary track) and a frontend, sharing one domain core:

- **Backend** — NestJS. Exposes the controller over a REST + SSE API and a CLI (scenario runner for CI + interactive REPL).
- **Frontend** — React + TypeScript (Vite). A live UI consuming the API.

The backend alone is a complete, CI-passing submission; the frontend is additive.

## 2. Requirements coverage

| # | Requirement | How it's met |
| --- | --- | --- |
| 1 | New normal order → PENDING | `add-order` (default type) creates a `PENDING` order |
| 2 | VIP order placed ahead of NORMAL, behind existing VIP | Priority comparator: `VIP > NORMAL`, ties by ascending id |
| 3 | Unique, increasing order numbers | Monotonic id counter, never reused |
| 4 | +Bot processes pending; 10s → COMPLETE; then next | `tryAssign` + Scheduler `now+10s`; on completion the bot re-runs `tryAssign` |
| 5 | No pending → bot IDLE | `tryAssign` leaves a bot `IDLE` when the queue is empty |
| 6 | −Bot destroys newest; processing order returns to original slot | Remove highest active id; cancel its timer; requeue order (comparator restores slot) |
| 7 | No persistence | In-memory singleton; nothing written to disk except `result.txt` output |

**CI contract** (`backend-verify-result` workflow): `scripts/{test,build,run}.sh` must each exit 0, and `scripts/result.txt` must exist, be non-empty, and contain `HH:MM:SS` timestamps. `run.sh` runs the CLI scenario runner in real time and writes real wall-clock timestamps to `scripts/result.txt`. (Note: `run.sh` must target `scripts/result.txt` explicitly — the stub's `> result.txt` writes to repo root.)

## 3. Architecture: one core, thin adapters

```
                    ┌─────────────────────────────┐
                    │      domain/ (pure TS)       │
                    │  OrderController + entities  │
                    │  Clock/Scheduler interfaces  │
                    │  emits domain events         │
                    └──────────────┬──────────────┘
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
 ┌──────▼──────┐          ┌────────▼────────┐         ┌────────▼────────┐
 │  cli/       │          │  api/ (NestJS)  │         │  (tests)        │
 │ scenario    │          │  REST + SSE     │         │  fake clock,    │
 │ runner +    │          │  serves React   │         │  fast-forward   │
 │ interactive │          │  static build   │         │                 │
 └─────────────┘          └────────┬────────┘         └─────────────────┘
                                   │ SSE / REST
                          ┌────────▼────────┐
                          │ frontend/ React │
                          └─────────────────┘
```

The **core depends on nothing** — no Nest, no HTTP, no `Date`, no `setTimeout`. It receives a `Clock` and `Scheduler`. Adapters are thin: they translate transport/CLI input into core method calls and translate core events into output (log lines, SSE frames, UI state).

### Repo layout

```
se-take-home-assignment/
├── backend/
│   └── src/
│       ├── domain/        # pure-TS core + unit tests
│       ├── api/           # NestJS module: controllers, SSE, DTOs, static serving
│       ├── cli/           # scenario runner + interactive REPL
│       └── contracts.ts   # wire types (SSOT), imported by BE (relative) + FE (alias)
├── frontend/           # Vite + React TS (Phase 5)
├── scripts/            # test.sh / build.sh / run.sh
│   └── result.example.txt  # committed format sample (result.txt is git-ignored)
├── .gitignore
├── docs/
└── CONTEXT.md
```

## 4. Domain model

```ts
type OrderType   = 'NORMAL' | 'VIP';
type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';
type BotStatus   = 'IDLE' | 'PROCESSING';

interface Order { id: number; type: OrderType; status: OrderStatus; createdAt: Date; startedAt?: Date; completedAt?: Date; }
interface Bot   { id: number; status: BotStatus; currentOrderId: number | null; }
```

### Priority — the central idea

The PENDING area is ordered by one comparator:

```
rank(VIP) < rank(NORMAL); ties broken by ascending order id
```

Because ids are monotonic, this gives **FIFO within a tier** automatically, and it makes **Requeue (Req 6) free**: a returned order has a lower id than anything queued after it, so re-inserting by the comparator drops it back into its original slot — no bespoke "remember the position" logic.

### Dispatch

`tryAssign()` runs after every state change (order added, bot added, order completed, bot removed):

1. For each `IDLE` bot, take the highest-priority `PENDING` order (if any).
2. Mark order `PROCESSING`, bot `PROCESSING`, link them.
3. Schedule completion at `now + 10s` via `Scheduler`, keeping the cancel handle.

Node's single-threaded event loop means no locks or races — assignment is atomic within a tick.

### Bot removal (Req 6)

Remove the target bot (newest = max active id, or a given id). If it was `PROCESSING`: cancel its scheduled completion, set the order back to `PENDING` and unlink it (no progress is retained — next pickup is a fresh 10s), and `tryAssign()` so a remaining idle bot may pick it up.

### Time

```ts
interface Clock { now(): Date; }
interface Scheduler { schedule(delayMs: number, cb: () => void): CancelHandle; }
```

- **Production** (`SystemClock` / `RealScheduler`): `new Date()` + `setTimeout`. Real 10s.
- **Tests** (`FakeClock` / `FakeScheduler`): manual `advance(ms)` fires due callbacks synchronously — deterministic, instant.

### Linkage, ids & atomicity

- **The order↔bot link is one-directional.** `Bot.currentOrderId` is the single source of truth; "which bot has order X?" is *derived* when serializing `/api/status`. There is deliberately no `Order.assignedBotId` — two references could disagree.
- **Cancel handles are not entity state.** The controller holds a `Map<botId, CancelHandle>` for in-flight 10s completions. They can't live on `Bot`, which serializes to JSON/SSE.
- **IDs come from two monotonic counters** (orders, bots), starting at 1, incremented on creation, **never decremented or reused**. So `newest bot = max active id` (stable under any deletion), and a delete-then-create yields a fresh id — never a revived bot.
- **Dispatch is atomic.** Core mutations are **synchronous** — no `await` between selecting a `PENDING` order and marking it `PROCESSING`. Node's single thread then guarantees no two bots take the same order, and no delete/create interleaves mid-mutation. `tryAssign()` is idempotent and safe to call after every state change.
- **Zero bots is a valid state.** With no bots, `PENDING` orders simply wait (and a just-removed processing bot's order is requeued, never dropped). The next `add-bot` runs `tryAssign()` and drains the queue.

## 5. API surface

Commands map 1:1 across CLI and REST (same vocabulary). All optional params have defaults.

API is mounted under a global `/api` prefix; health is `GET /api/health`.

| CLI | REST | Default when omitted |
| --- | --- | --- |
| `add-order [--type normal\|vip]` | `POST /api/orders` `{type?}` | `normal` |
| `add-bot` | `POST /api/bots` | — |
| `del-bot [--id <id>]` | `DELETE /api/bots/:id` and `DELETE /api/bots` | newest |
| `list-orders [--type normal\|vip]` | `GET /api/orders?type=` | all types |
| `list-bots` | `GET /api/bots` | — |
| `status` | `GET /api/status` | — (full snapshot / UI bootstrap) |
| (live updates) | `GET /api/events` (SSE) | — |
| `help`, `exit` | — | REPL only |

`DELETE /api/bots` (no id) is explicitly defined as "remove the newest **one**", not "delete all". `DELETE /api/bots/:id` with an unknown id, and `DELETE /api/bots` when no bots exist, both return **404** with a clear message (the CLI prints a friendly "no bot to remove"). NestJS uses `ValidationPipe` + DTOs on inputs.

SSE emits the full `StatusDTO` snapshot on connect and on every domain event; the client replaces state (no delta/patch logic).

### Backend conventions (NestJS)

- **Thin controllers; logic stays in the core.** Controllers validate input (DTOs + global `ValidationPipe` with `whitelist`/`transform`) and delegate to the domain core, exposed as a **singleton provider** (a factory wiring the real `Clock`/`Scheduler`). No business rules in HTTP handlers.
- **Native SSE** via `@Sse('events')` returning `Observable<MessageEvent>`, bridged from the core's event stream (an RxJS `Subject`).
- **Correct status codes** via Nest `HttpException`/filters: `404` for an unknown/absent bot, `400` for an invalid `type` (automatic through `ValidationPipe`).
- **`ConfigModule`** for env (`PORT`, cook-duration ms — tunable without code changes); **`ServeStaticModule`** for the SPA with `index.html` fallback.
- **Tests:** core unit tests are plain Jest (no Nest); API e2e uses `@nestjs/testing` + `supertest`.

## 6. Frontend

- **One `EventSource`, opened once** in a `useEventSource` hook (cleanup on unmount; the browser auto-reconnects). No duplicate listeners.
- **`useReducer` is the single store**, seeded from `GET /api/status`, then patched by SSE events — the server is the source of truth; the client never re-derives business state. No Redux/Zustand/React-Query needed.
- **Derive during render, not in effects.** Counts, groupings, and "is this order processing" are computed from state at render time (no extra renders, no stale effects).
- **Isolate the per-order countdown.** `remaining = startedAt + duration − now`, ticked inside a small leaf component (or one shared interval), so the 1s tick never re-renders the whole tree.
- **Conditional rendering with ternaries, not `&&`** — counts can be `0`, and `{count && …}` would render a literal `0`.
- **No components defined inside components**; typed props throughout; strict TS, no `any`.
- **Accessible real-time UI:** semantic `<button>`s and `aria-live="polite"` on the PENDING/COMPLETE regions so updates are announced — a cheap standout that shows care.
- **Layout:** **PENDING** area (priority-ordered, VIP badged) and **COMPLETE** area per the README; `PROCESSING` orders render attached to the bot cooking them with a countdown. Controls: New Normal / New VIP / +Bot / −Bot. Plain CSS / CSS modules — clean visual design over a heavy UI library.

## 7. Testing

- **Unit (core, Jest + FakeClock)**: priority insertion incl. VIP-behind-VIP; unique increasing ids; 10s completion; idle when empty; **requeue restores original slot**; remove-newest semantics; remove specific id. Fast and deterministic.
- **E2E (NestJS)**: command endpoints, `/api/status` shape, an SSE smoke test.
- The pure core is what carries the bulk of coverage — it has no I/O to mock.

## 8. Deployment

Single **Cloud Run** service: NestJS serves the API, the SSE stream, and the static React build (SPA fallback to `index.html`) from one origin — **no CORS**, one URL. Configure `--min-instances=1 --max-instances=1` with CPU always allocated so background 10s timers fire reliably and in-memory state is stable for the demo. Frontend and backend deploy together via one Dockerfile.

## 9. Demo scenario (drives `result.txt`)

A scripted, real-time sequence exercising all 7 requirements, including: create NORMAL + VIP + NORMAL (show priority ordering), add two bots (show VIP picked first), let one complete and pick the next, add a VIP and remove a processing bot (show requeue to original slot), drain to IDLE. Each event is logged with a real `HH:MM:SS` timestamp.

## 10. Engineering principles & deliberate non-goals

**Principles applied:** single responsibility (framework-free core vs thin adapters); dependency inversion (the core depends on `Clock`/`Scheduler` *interfaces*, not Node APIs); pure, easily-tested functions (the priority comparator); illegal states unrepresentable (string-literal unions); validation at the edges; deterministic tests.

**Deliberately NOT built** — honouring the README's "do not over engineer" / "do not bring in all the fancy tech stuff":

| Not doing | Why |
| --- | --- |
| Database / ORM / Redis | Req 7 is in-memory; the data is ephemeral |
| WebSockets / message queue / microservices | traffic is push-only; SSE + one service suffice |
| Redux / Zustand / React Query | `useReducer` + SSE is enough; fewer dependencies |
| GraphQL | a handful of REST endpoints is simpler |
| CQRS / event-sourcing / DDD aggregates | the event stream is a simple in-process emitter, not an architecture |
| Auth / multi-tenancy / persistence | out of scope for a prototype |

**Single sources of truth (DRY).** Each concept is defined in exactly one place; everything else derives from or references it:

| Concept | The one place it lives |
| --- | --- |
| Priority rule | the comparator function (used by insert, requeue, and dispatch ordering) |
| Current time | the injected `Clock` / `Scheduler` |
| All mutable state | the singleton in-memory controller |
| Order↔bot link | `Bot.currentOrderId` (the reverse is derived) |
| "What happened" | the domain-event stream (feeds `result.txt`, SSE, and logs) |
| Command handling | one dispatcher (CLI scenario + REPL); CLI & REST call the same core methods |
| Wire types | `backend/src/contracts.ts`, imported by BE (relative) + FE (Vite alias) |

The expansion beyond the README's "~1 hour" suggestion (full-stack + live UI + deploy + docs) is a **deliberate, scoped** choice to stand out — but every added piece is right-sized, and the **backend alone remains a complete, CI-passing submission**. The design aims to stand out by judgment and clarity, not by stacking technology.

## 11. Logging

Two streams from two distinct sources — and **no separate "audit" system**, because that would duplicate the event stream:

- **Work / audit log = a projection of the one domain-event stream** (the SSOT for "what happened"). A single formatter renders events to timestamped lines — to `scripts/result.txt` in the CLI, and to stdout via Nest's `Logger` in the server. A new consumer subscribes to the same stream; it never re-reads state.
- **Operational / error log = Nest's `Logger`** for exceptions (via an exception filter), validation failures, and lifecycle (startup, shutdown, SSE connect/disconnect). These are not domain truth, so they stay separate.

Levels: domain events at `log`/info; problems at `warn`/`error`. Default to Nest's **built-in `Logger`** (zero deps). *Optional standout:* `nestjs-pino` for structured JSON logs (ingested natively by Cloud Run Logging) + request correlation — an upgrade with one dependency, not the default.

## 12. Implementation notes / gotchas

1. **Real-time CI runtime:** `result.txt` is produced by the real CLI honouring real 10s cooks, so the scenario takes ~30–40s in CI (authentic 10s gaps, matching the sample). Deliberate — do not swap in a fake clock to speed it up.
2. **SPA vs API route precedence:** `ServeStaticModule`'s `index.html` fallback must be registered *after* / excluding the API routes, so it doesn't swallow them. The global `/api` prefix cleanly partitions API routes from SPA routes — `ServeStaticModule` serves all non-`/api` paths with no route-collision. Classic single-service footgun, solved by the prefix.
3. **`DELETE /api/bots` → `404` when empty** is a deliberate choice over an idempotent `204`; be ready to justify it.
4. **One SSE connection per client**, opened once; the single pinned Cloud Run instance serves all viewers (fine for a demo).
5. **Build MUST stay on `tsc`/`nest build`, NOT webpack:** webpack bundles only `main.ts` and drops `dist/cli/scenario.js`, which `run.sh`/CI runs. Both `dist/main.js` and `dist/cli/scenario.js` must emit.
6. **`scripts/result.txt` is git-ignored** and regenerated each run; `scripts/result.example.txt` is the committed format sample.
