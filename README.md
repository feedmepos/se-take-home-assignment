## FeedMe Software Engineer Take Home Assignment

## Solution Summary

This submission implements the **backend CLI option in Go**. The application is an in-memory order
controller with an interactive CLI for the interview round and a scripted demo for GitHub Actions.

### Run

```bash
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

The run script writes timestamped demo output to `scripts/result.txt`, which is the file verified by
the `backend-verify-result` GitHub Actions workflow.

After building, the interactive CLI can be started with:

```bash
./bin/order-controller -i
```

Interactive commands:

```text
normal   create a Normal order
vip      create a VIP order
+bot     add a cooking bot
-bot     remove the newest cooking bot
status   print current state
quit     stop bots and exit
```

### Design

- The core controller is UI-agnostic and lives under `internal/controller`.
- A single mutex guards all mutable state: pending orders, processing bots, completed orders, and the
  next order ID. Order ID generation is shared state, so it happens under that same lock.
- Pending orders use one ordering rule everywhere: VIP before Normal, then lower order ID first.
  The monotonic order ID therefore satisfies the "unique and increasing" requirement and restores
  interrupted orders to their original FIFO position.
- Each processing order is driven by a timer and a cancellable context. When completion fires, the
  controller re-checks that the bot still owns that exact order before moving it to COMPLETE, so stale
  completions after bot removal are ignored.
- Tests use a minimal fake timer to make completion/cancellation interleavings deterministic. The fake
  timer controls when completion fires; the mutex plus ownership re-check controls the outcome.

### Requirements to Tests

| Requirement | Test coverage |
| --- | --- |
| Normal order enters PENDING | `TestOrdersStayPendingWhenThereAreZeroBots` |
| VIP enters before Normal and behind earlier VIPs | `TestVIPBeforeNormalFIFOWithinKind` |
| Order number is unique and increasing | `TestOrderIDsUniqueAndIncreasing` |
| `+bot` immediately processes pending work | `TestAddingBotImmediatelyPicksUpPendingWork` |
| Bot completes an order and picks the next one | `TestBotCompletesThenPicksNextOrder` |
| Idle bot waits for future work | `TestIdleBotPicksUpNewlyArrivingOrder` |
| `-bot` removes the newest bot | `TestRemoveBotTargetsNewestBotLIFO` |
| Removing an idle bot does not affect orders | `TestRemovingIdleBotDoesNotAffectOrders` |
| Removing a processing bot restores original queue position | `TestRemovingProcessingBotRequeuesAtExactPriorityPosition`, `TestRequeuedVIPPreservesFIFOAmongVIPs`, `TestMultiBotRemovalRestoresReturnedOrdersInOriginalOrder` |
| Returned work is assigned to another idle bot immediately | `TestRequeuedOrderIsImmediatelyPickedUpByRemainingIdleBot` |
| Timer/removal race does not lose or duplicate orders | `TestStaleCompletionAfterRemovalCannotDuplicateOrLoseOrder`, `TestRandomizedOperationsPreserveOrderConservation` |
| Interactive CLI commands map to controller operations | `TestExecuteCommandAliasesAndStatus`, `TestExecuteCommandUnknownAndQuit` |

### Scope Decisions

This is intentionally not a web app, database-backed service, Docker setup, or framework-heavy
project. The brief asks for either a frontend or backend implementation and explicitly cautions
against over-engineering, so this submission focuses on the backend track: the controller state
machine, deterministic tests, CI scripts, and an interview-ready CLI.

### Full-system Extensibility

The controller is designed so a web UI can be added without reimplementing order logic. A thin
`net/http` adapter would call the same mutation methods (`AddOrder`, `AddBot`, `RemoveBot`) and render
`Snapshot()` as JSON or server-sent events:

```go
http.HandleFunc("/api/state", func(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(controller.Snapshot())
})
```

That extension is deliberately not included here: the assignment asks for one track, and keeping the
core UI-agnostic gives the extension point without adding unrequested infrastructure.

AI was used to help enumerate adversarial edge cases such as concurrent removal, stale timer
completion, and order conservation. Those cases were treated as hypotheses, encoded as deterministic
tests, and verified with `go test -race`.

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
