# AGENTS.md

## Project

McDonald's automated cooking-bot **order controller** — the FeedMe SE take-home
assignment. Backend option implemented in **Go** as a CLI application that runs
in GitHub Actions.

## Layout

```
go.mod                                   # module: order-controller (Go 1.23)
cmd/order-controller/main.go             # CLI entry: interactive REPL + -demo
internal/controller/manager.go           # core order/bot logic
internal/controller/manager_test.go      # unit tests
scripts/build.sh                         # go build -o order-controller ./cmd/order-controller
scripts/test.sh                          # go test ./... -v -race
scripts/run.sh                           # ./order-controller -demo | tee scripts/result.txt
scripts/result.txt                       # generated CLI output (must contain HH:MM:SS timestamps)
.github/workflows/backend-verify-result.yaml  # CI: runs test.sh -> build.sh -> run.sh, verifies result.txt
```

## Commands

- Build: `./scripts/build.sh`
- Test: `./scripts/test.sh` (always run with `-race`)
- Run demo: `./scripts/run.sh` (real 10s processing; short scenario, ~25-40s)
- Vet: `go vet ./...`

Always run `go vet ./...` and `./scripts/test.sh` after changes.

## Requirements (from README)

1. New Normal order -> PENDING area.
2. New VIP order -> PENDING, ahead of all Normal but behind existing VIP.
3. Order numbers are unique and strictly increasing.
4. `+ Bot` processes a pending order; after 10s it moves to COMPLETE, then picks
   the next pending order.
5. Idle bot when no pending orders.
6. `- Bot` destroys the newest bot; if it was processing, that order returns to
   its original priority position in PENDING.
7. In-memory only, no persistence.
8. Interactive CLI is compulsory; `result.txt` output must include `HH:MM:SS`
   timestamps.

## Architecture

Channel-based, lock-free design (no mutexes):

- **`Manager`** owns all mutable state (`pending`, `completed`, `bots`, `idle`,
  sequences). A single **event-loop goroutine** (`loop`) serializes three
  inputs: `commands` (public API closures), `done`, and `returned`. Because only
  the loop touches state, no locking is needed.
- Public API (`AddNormalOrder`, `AddVIPOrder`, `AddBot`, `RemoveBot`, `Status`,
  `Stop`) sends a closure onto `commands` and waits on a reply channel — this
  keeps calls synchronous while state stays single-owner.
- **`bot`** is a self-contained worker sharing **no memory** with the Manager.
  It communicates purely over channels:
  - `orders` (Manager -> bot): next order to cook
  - `cancel` (Manager -> bot): stop now
  - `done` (bot -> Manager): order finished cooking
  - `returned` (bot -> Manager): in-flight order handed back on cancel
  Its `run` loop waits for an order, cooks for `procDur`, then reports; a cancel
  while cooking pushes the order onto `returned` and exits.
- **Priority queue**: `pending` is a slice kept sorted by `less` (VIP before
  Normal, then ascending ID). The same `insertPending` handles new orders *and*
  re-queued cancelled orders, so a returned order lands back in its correct
  position (requirement 6).
- **Idle set**: `idle` is a `container/list.List` used as a FIFO. Each `bot`
  caches its `*list.Element` (`elem`) for O(1) push/pop/remove with no
  backing-array growth. `elem != nil` means the bot is idle.
- **`RemoveBot`** removes the newest bot and closes its `cancel`; the bot itself
  returns any in-flight order via the `returned` channel, and the loop re-queues
  it. `procDur` is injectable (10s in prod, ms in tests).

## Conventions

- No comments unless they add real value (package already documents the design).
- Keep the bot/Manager decoupling: bots never reference the Manager; all
  coordination is via channels.
- Timestamp format is Go's `15:04:05` (`HH:MM:SS`).
- Don't reintroduce mutexes or a `Manager` back-reference inside `bot`.
- Never commit the built `order-controller` binary (see `.gitignore`).

## Testing notes

- Tests use small `procDur` (e.g. 50ms) via `NewManager(dur, io.Writer)` for
  speed and determinism; a `waitFor` helper polls for async conditions.
- Coverage: unique/increasing IDs, VIP ordering, complete-to-COMPLETE, idle when
  empty, `+bot` picks up pending, `-bot` returns in-flight order to correct
  position, concurrent adds under `-race`.
