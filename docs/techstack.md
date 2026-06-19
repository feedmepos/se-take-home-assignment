# Technical Stack and Solution

## 1. Stack Decision

The project will be implemented as a Go terminal user interface (TUI) application.

| Area | Choice | Reason |
| --- | --- | --- |
| Language | Go 1.23+ | The GitHub Actions workflow currently installs Go 1.23.9, so the implementation targets that version while also working on newer local Go versions. |
| TUI framework | Bubble Tea v1.2.4 | Event-driven TUI framework that fits keyboard input, timer ticks, and reactive screen updates while remaining compatible with Go 1.23. |
| Terminal styling | Lip Gloss v1.0.0 | Lightweight styling and layout library for terminal panels, borders, colors, and alignment while remaining compatible with Go 1.23. |
| Optional components | None | Manual rendering is enough for the MVP; no Bubbles dependency is needed. |
| CLI routing | Go standard library | Use `os.Args` or `flag`; no Cobra dependency is needed for two modes. |
| Tests | Go standard `testing` package | Keeps tests simple and CI-friendly. |
| Persistence | None | All state stays in memory as required by the assignment. |

## 2. Why This Stack

Bubble Tea is the best fit for this assignment because the application is a small event-driven terminal UI:

- User actions create orders and manage bots.
- Timer ticks update processing progress.
- The screen needs to re-render as state changes.
- The app needs to stay responsive while orders are processing.

Lip Gloss complements Bubble Tea by keeping layout code readable without introducing a web frontend or heavy UI framework.

The implementation should avoid extra dependencies unless they clearly reduce complexity. In particular:

- Do not add a database.
- Do not add a web server.
- Do not add a full CLI framework unless command routing becomes more complex.
- Do not add a background job library; the scheduler is small enough to model directly.

## 3. Application Modes

The binary should support two modes:

```text
order-controller tui
order-controller demo
```

### `tui`

Starts the interactive terminal UI for the interview demo.

Required interactions:

- `n`: create normal order.
- `v`: create VIP order.
- `+`: add bot.
- `-`: remove newest bot.
- `q`: quit.

### `demo`

Runs a deterministic scripted simulation for GitHub Actions and writes `scripts/result.txt`.

The output must:

- Include timestamps in `HH:MM:SS` format.
- Demonstrate VIP priority.
- Demonstrate bot assignment and completion.
- Demonstrate removing a bot.
- Be deterministic enough for automated verification.

## 4. Proposed Project Structure

```text
.
|-- cmd/
|   `-- order-controller/
|       `-- main.go
|-- internal/
|   |-- controller/
|   |   |-- controller.go
|   |   `-- controller_test.go
|   |-- demo/
|   |   `-- demo.go
|   `-- tui/
|       |-- model.go
|       `-- styles.go
|-- scripts/
|   |-- build.sh
|   |-- run.sh
|   |-- test.sh
|   `-- result.txt
|-- docs/
|   |-- requirement.md
|   `-- techstack.md
|-- go.mod
`-- go.sum
```

## 5. Core Design

### Domain Model

The core controller should own the business state:

- Orders.
- Pending queue.
- Completed order list.
- Active bots.
- Event log.
- Next order ID.
- Next bot ID.

Suggested order fields:

```text
ID
Type: NORMAL | VIP
Status: PENDING | PROCESSING | COMPLETE
CreatedAt
StartedAt
CompletedAt
AssignedBotID
```

Suggested bot fields:

```text
ID
Status: IDLE | PROCESSING
CurrentOrderID
StartedAt
```

### Scheduling

The controller should expose small methods:

```text
CreateOrder(type, now)
AddBot(now)
RemoveNewestBot(now)
Tick(now)
Snapshot(now)
```

`Tick(now)` should complete any order whose processing window has reached 10 seconds, then schedule idle bots against the pending queue.

This design avoids long-running per-order timers in the domain layer. Removing a bot simply clears the bot assignment and returns the order to `PENDING`; a later tick cannot complete that order because it is no longer assigned to a bot.

### Queue Priority

The pending queue must always follow:

1. VIP orders before normal orders.
2. FIFO order within the same order type.

This can be implemented with either:

- Two queues: one VIP queue and one normal queue.
- A single pending list with controlled insertion.

For this small project, two queues are clearer and less error-prone.

## 6. TUI Design

The TUI should be a single operational screen with four areas:

```text
+----------------+  +----------------------+
| Pending Orders |  | Bots / Processing    |
| VIP #3         |  | Bot #1 VIP #3 7s     |
| Normal #1      |  | Bot #2 IDLE          |
+----------------+  +----------------------+

+------------------+
| Completed Orders |
| Normal #2        |
+------------------+

Events:
[12:00:01] Created VIP order #3
[12:00:02] Bot #1 picked up VIP order #3

Keys: n normal | v VIP | + add bot | - remove bot | q quit
```

The TUI update loop should:

- Handle key messages for user actions.
- Trigger a regular tick, such as every 250ms or 1s.
- Call `controller.Tick(time.Now())`.
- Render a snapshot of current state.

## 7. Script Plan

### `scripts/test.sh`

```sh
go test ./...
```

### `scripts/build.sh`

```sh
go build -o order-controller ./cmd/order-controller
```

### `scripts/run.sh`

```sh
./order-controller demo > scripts/result.txt
```

The scripts should use `set -euo pipefail` so CI fails on errors.

## 8. Testing Strategy

Use the Go standard `testing` package and keep the controller deterministic.

Recommended tests:

- Normal orders receive increasing IDs.
- VIP orders are processed before normal orders.
- VIP orders preserve FIFO ordering.
- Normal orders preserve FIFO ordering.
- Adding a bot immediately picks up pending work.
- Idle bots wait when there are no orders.
- A completed bot immediately picks up the next pending order.
- Removing an idle bot only removes the bot.
- Removing a processing bot returns its order to pending.
- Interrupted orders do not complete on later ticks.
- Demo output contains `HH:MM:SS` timestamps.

Use fixed `time.Time` values in tests rather than sleeping for 10 seconds.

## 9. Dependency Policy

Use the CI-compatible Charm versions pinned in `go.mod`:

```text
github.com/charmbracelet/bubbletea v1.2.4
github.com/charmbracelet/lipgloss v1.0.0
```

Do not add Bubbles unless a built-in component clearly helps:

```text
github.com/charmbracelet/bubbles
```

Avoid other dependencies for the MVP.

## 10. Research References

- Go official downloads: https://go.dev/dl/
- Bubble Tea: https://github.com/charmbracelet/bubbletea
- Lip Gloss: https://github.com/charmbracelet/lipgloss
- Bubbles: https://github.com/charmbracelet/bubbles
