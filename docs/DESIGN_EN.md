# FeedMe Kitchen — Design (English)

This document describes the **in-memory** order and bot model implemented in this repository: domain rules, the `Memory` repository layout, the `Kitchen` service (bots and cooking), and **worked numeric examples** for queue operations.

It reflects the code as implemented (not the README alone). Paths refer to this repo.

---

## 1. Goals (README user stories)

| Goal | Implementation idea |
|------|------------------------|
| Normal / VIP orders appear as **pending** | `CreatePendingOrder` + tier-specific tail enqueue |
| **VIP before Normal** globally | `DequeuePeek` always prefers the VIP sub-queue when non-empty |
| New VIP **after existing VIP**, but **before all Normal** | Two slices: `pendingVIP`, `pendingNorm`; new VIP `append` to VIP slice only |
| **Monotonic unique** order IDs | `domain.OrderIDSeq`; first `Next()` returns **1** (`internal/domain/orderid.go`) |
| Bots pick **one** order at a time, **~10s** cook | `Kitchen.runBot` + `clock.Sleep` on a per-cook context |
| **+Bot** starts workers that drain pending | `AddBot` + `AcquireNext` loop |
| **-Bot** removes **newest** bot; in-flight order returns to pending | `RemoveBot` (LIFO) cancels bot context → `CancelAndRequeue` if cook was interrupted |
| No persistence | All state in `Memory` + `Kitchen` in RAM |

---

## 2. Layering

| Layer | Package / type | Role |
|-------|------------------|------|
| Domain | `internal/domain` | `Order`, status transitions, `OrderIDSeq`, **queue math** (`DequeuePeek`, `RequeueInsertIndex`, …) |
| Repository | `internal/repository/memory` | `Memory`: `orders` map + `pendingVIP` / `pendingNorm` ID slices + `AcquireNext` wake |
| Service | `internal/service` | `Kitchen`: bot pool, cook duration, wires `Memory` |
| API | `internal/api` | HTTP handlers, JSON DTOs |

---

## 3. Domain model

### 3.1 Order

`internal/domain/order.go` — key fields:

- **`ID`**: `OrderID` (`uint64`), from `OrderIDSeq`.
- **`Tier`**: `TierNormal` or `TierVIP` (`internal/domain/types.go`).
- **`Status`**: `pending` → `processing` → `complete`, or `exception`, or back to `pending` on cancel.
- **`PendingTier` / `PendingIndex`**: Filled when an order **starts processing** (`StartProcessing`). Used when **re-inserting** into the correct tier slice after `CancelAndRequeue` (and for manual `RequeueToPending`).

### 3.2 Transitions

`internal/domain/transition.go`:

- **`StartProcessing`**: `pending` → `processing`, sets `BotID`, `PendingTier`, `PendingIndex`, `StartedAt`.
- **`CancelProcessingToPending`**: `processing` → `pending`, clears `BotID`, clears `StartedAt`; **keeps** `PendingTier` / `PendingIndex` for requeue placement.
- **`Complete`**, **`FailToException`**, **`RetryFromExceptionToPending`**: as names suggest.

---

## 4. Queue rules (pure functions)

`internal/domain/queue_rules.go`:

- **`DequeuePeek(vipLen, normalLen)`** — next assignment source: **VIP if `vipLen > 0`**, else **Normal if `normalLen > 0`**, else no work.
- **`RequeueInsertIndex(currentTierLen, originalIndex)`** — clamps `originalIndex` to `[0, currentTierLen]` so re-insert never panics.

**FIFO within each tier**: new pending IDs are **`append`**ed to the tail of the corresponding slice (`enqueuePendingLocked`).

---

## 5. `Memory` layout

`internal/repository/memory/memory.go`:

| Field | Meaning |
|-------|---------|
| `orders` | `map[OrderID]*Order` — authoritative order records |
| `pendingVIP` | Slice of **pending** VIP order IDs, **front = index 0** |
| `pendingNorm` | Same for Normal |
| `wake` | Buffered `chan struct{}` — `notify()` wakes blocked `AcquireNext` waiters |
| `mu` | One mutex for all `Memory` mutations / reads |

**Invariant**: An ID must not appear twice in the union of the two pending slices (`containsPendingLocked`).

**Processing orders** are **not** in either pending slice; they only live in `orders` with `Status == processing`.

---

## 6. Assignment (dequeue to bot)

`tryAssignLocked`:

1. `DequeuePeek(len(pendingVIP), len(pendingNorm))`.
2. Pop **head** of the chosen slice: `id := slice[0]`, then `slice = slice[1:]` (Go slice re-slice; logical FIFO).
3. Call `StartProcessing(botID, tier, idx)` on that order.

**Important implementation detail**: `idx` passed to `StartProcessing` is **hard-coded to `0`** on this path (both VIP and Normal branches). So for orders that entered `processing` via `AssignNextToBot` / `AcquireNext`, **`PendingIndex` is always `0`** after assignment.

That implies **`CancelAndRequeue`** (which uses `RequeueInsertIndex(tierLen, o.PendingIndex)`) will typically re-insert at **index 0** of that tier’s slice — i.e. **front of the VIP or Normal sub-queue**, not “middle of the global merged queue” unless another path set a different `PendingIndex` (e.g. tests or `RequeueToPending` with a non-zero index).

---

## 7. `Kitchen` and bots

`internal/service/kitchen.go`:

- **`AddBot`**: allocates `BotID`, appends a `botHandle` `{ id, cancel }`, starts `runBot(botCtx, id)` in a goroutine.
- **`RemoveBot`**: **LIFO** — removes **`k.bots[len-1]`**, calls its `cancel()`, waits `wg` so the goroutine exits cleanly.
- **`runBot`**:
  1. `AcquireNext(ctx, botID)` — blocks until an order is assigned or `ctx` canceled.
  2. Cooks with `Sleep(cookCtx, cookDuration)` where `cookCtx` is cancelable when the **bot** context is canceled during cook.
  3. If sleep ends with **`context.Canceled`** → **`CancelAndRequeue(order.ID, id)`** (README “-Bot” path).
  4. Else on success → **`CompleteOrder`**.

So **only the bot that was removed** (the **newest** one) may fire `CancelAndRequeue` for **its current** processing order — not “the order before `pendingVIP[0]`” in general (see demo D4).

---

## 8. `insertIDAt` — when `copy` matters

`insertIDAt(s, i, id)` (`memory.go`):

1. Clamp `i` to `[0, len(s)]`.
2. `append(s, 0)` — grow by one slot (placeholder zero `OrderID`).
3. `copy(s[i+1:], s[i:])` — shift suffix right by one (no-op if `i == len(s)` before append, i.e. pure tail insert).
4. `s[i] = id`.

### Demo I1 — middle insert (`copy` moves data)

- Before: `s = [2, 3, 5]`, insert `id = 9` at **`i = 1`** (before old `3`).
- After `append`: `[2, 3, 5, 0]`
- After `copy(s[2:], s[1:])`: `[2, 3, 3, 5]` (temporary duplicate at index 1)
- After `s[1] = 9`: **`[2, 9, 3, 5]`**

### Demo I2 — tail insert (`copy` length zero)

- Before: `s = [2, 3, 5]`, insert at **`i = 3`** (`len(s)`).
- After steps: **`[2, 3, 5, 9]`** — equivalent to append.

---

## 9. End-to-end numeric demos

Digits **`1`, `2`, `3`, …** denote **`OrderID`s**. **`pendingVIP` / `pendingNorm`** only list **pending** IDs; **processing** IDs are absent from these slices.

### D1 — VIP FIFO, dequeue head

| Step | Event | `pendingVIP` | `pendingNorm` |
|------|--------|----------------|---------------|
| 0 | Create VIP 1,2,3 | `[1, 2, 3]` | `[]` |
| 1 | Bot assigns | `[2, 3]` | `[]` | (order **1** → `processing`) |
| 2 | Complete 1 | `[2, 3]` | `[]` | (order **1** → `complete`; unchanged slices) |

### D2 — VIP vs Normal (`DequeuePeek`)

| Step | Event | `pendingVIP` | `pendingNorm` |
|------|--------|----------------|---------------|
| 0 | VIP 1 pending, Normal 2 pending | `[1]` | `[2]` |
| 1 | Assign | `[]` | `[2]` | (VIP **1** taken first) |
| 2 | Assign | `[]` | `[]` | (Normal **2** next) |

### D3 — `CancelAndRequeue` with backlog (order **1** is VIP, was processing)

While **1** cooks, more VIPs enqueue: `pendingVIP = [5, 6]`, `pendingNorm` unchanged.

After cancel for order **1** (VIP), with **`PendingIndex == 0`** (default from `tryAssignLocked`):

- `RequeueInsertIndex(len([5,6]), 0) → 0`
- `insertIDAt([5, 6], 0, 1)` → **`pendingVIP = [1, 5, 6]`**

If order **1** were **Normal**, it would re-enter **`pendingNorm`**, and **`pendingVIP` would stay `[5, 6]`**.

### D4 — Why cancel is not “the ID before `pendingVIP[0]`”

Suppose two bots:

- Bot A processing VIP **3**
- Bot B processing VIP **4**
- `pendingVIP = [5, 6]` (still waiting)

`RemoveBot` removes **only the newest bot** (LIFO). The requeued order is **whichever order that bot was cooking** (e.g. **4**), not necessarily related to **5** as “previous element in the slice” — **5** was never adjacent to **4** in `pendingVIP` because **4** left the slice when assigned.

---

## 10. Snapshot and HTTP (short)

- **`Kitchen.Snapshot`** (`internal/service/snapshot.go`): builds `pending` / `processing` / `complete` / `exception` via `Memory.ListByStatus`, and **bot list** from `Kitchen`’s bot handles (sorted by ID). Pending order order matches **VIP slice then Normal slice** (`ListByStatus` for `OrderPending`).
- **Routes** (`internal/api/server.go`): health, create order (`POST /api/v1/orders`), snapshot, bots `GET/POST`, remove latest bot `DELETE /api/v1/bots/latest`, exception retry `POST /api/v1/orders/{id}/retry`.

---

## 11. Concurrency notes

- **`Memory`**: single `sync.Mutex` protects map + slices + seq; `AcquireNext` uses `wake` + `context.AfterFunc` on `ctx` to unblock waiters on cancel.
- **Bots**: each `runBot` is a goroutine; `Kitchen` holds a mutex only around **bot slice / seq** for add/remove, not around the whole cook (memory has its own lock).

---

## 12. Known nuance vs README requirement 6

README asks that on “-Bot”, the order returns to its **“original position”** in pending while keeping VIP/Normal priority.

This codebase enforces **tier** via `PendingTier` and **position inside that tier’s slice** via `RequeueInsertIndex` + `insertIDAt`. Because **`PendingIndex` is always `0`** for orders assigned through `tryAssignLocked`, **requeue after bot interrupt is typically “front of that tier’s slice”**, not a remembered mid-queue index from before dequeue — unless another API path established a different `PendingIndex`.

---

*Generated from the current codebase layout and behavior.*
