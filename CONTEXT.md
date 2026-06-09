# CONTEXT — McDonald's Order Controller

Domain glossary and language for this project. Use these exact terms in code, tests, issues, and docs.

## The problem

An automated-cooking-bot order controller for a fast-food restaurant. Customers submit orders; cooking bots process them one at a time; the manager scales the number of bots up and down. State is held entirely in memory — no persistence.

## Glossary

| Term | Definition |
| --- | --- |
| **Order** | A customer request to be cooked. Has a unique, monotonically increasing **id** starting at `1001` to match the employer sample, a **type**, a **status**, and timestamps (`createdAt`; `startedAt` set when PROCESSING begins, cleared on requeue; `completedAt`). |
| **Order type** | `NORMAL` or `VIP`. Determines queue priority. Default is `NORMAL`. |
| **Order status** | `PENDING` → `PROCESSING` → `COMPLETE`. A `PROCESSING` order can revert to `PENDING` if its bot is removed (see **Requeue**). |
| **Bot** | A cooking worker with a unique, monotonically increasing **id** and a **status**. Processes exactly one order at a time. |
| **Bot status** | `IDLE` (alive, no order) or `PROCESSING` (cooking an order). Removal deletes the bot; it is not a status. |
| **PENDING area** | The ordered collection of orders waiting to be picked up. |
| **COMPLETE area** | Orders that finished cooking. |
| **Priority** | The ordering rule of the PENDING area: **VIP before NORMAL; ties broken by ascending order id.** This single comparator yields FIFO-within-tier and correct requeue placement. |
| **Pickup / Dispatch** | An `IDLE` bot taking the highest-priority `PENDING` order and starting to cook it (`tryAssign`). |
| **Processing time** | Fixed **10 seconds** per order, measured via the injected **Clock/Scheduler**. |
| **Requeue** | When a `PROCESSING` bot is removed, its order reverts to `PENDING` and re-enters the PENDING area at its original priority slot. Processing **restarts from scratch** on next pickup (no partial progress). |
| **Newest bot** | The bot with the highest active id. Target of `del-bot` when no id is given (LIFO). |
| **Clock / Scheduler** | Injected time source. Production uses real wall-clock + `setTimeout`; unit tests inject a fake clock to fast-forward deterministically. |
| **Domain event** | A typed fact emitted by the core (`OrderCreated`, `OrderStarted`, `OrderCompleted`, `OrderRequeued`, `BotAdded`, `BotRemoved`, `BotIdle`). The `result.txt` logger and the SSE stream both derive from these. |

## Invariants

1. Order ids and bot ids are each **unique, monotonically increasing, never reused**.
2. A bot processes **at most one** order at a time.
3. The PENDING area is always ordered by the **Priority** comparator.
4. Removing a `PROCESSING` bot always **requeues** its order (never drops it).
5. All state is **in memory**; nothing is persisted.
6. **Zero bots is a valid state**: `PENDING` orders wait (none are dropped) until a bot exists. IDs are never recycled.
