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

## Solution (Backend, Node.js)

Plain Node.js 22, **zero dependencies**, CommonJS. Tests use the built-in `node:test` runner.

### Layout

```
src/order.js        Order, OrderType, OrderStatus
src/bot.js          Bot, BotStatus — owns its own cooking timer
src/controller.js   Queues and orchestration (no I/O, no printing)
src/logger.js       HH:MM:SS timestamps and state rendering
src/demo.js         Scripted scenario -> scripts/result.txt
src/cli.js          Interactive REPL
test/               Unit tests + a fake clock
scripts/            test.sh / build.sh / run.sh
```

### Running it

```bash
./scripts/test.sh    # unit tests (milliseconds)
./scripts/build.sh   # syntax-checks sources; nothing to compile
./scripts/run.sh     # scripted demo, ~40s, writes scripts/result.txt

npm start            # interactive CLI
```

Interactive commands: `normal`, `vip`, `bot+`, `bot-`, `status`, `help`, `exit`.

### Design notes

**Two queues, not one.** `Controller` keeps a VIP queue and a normal queue. Bots always drain VIP
first. This satisfies "VIP ahead of normal, behind existing VIP" without any sorting or priority
field on the order.

**Requeue by id.** When a bot is destroyed mid-cook (requirement 6), the order returns to its own
queue at the position where its id belongs. Because order ids are globally increasing, sorting by id
*is* the original position — no index bookkeeping, and VIP priority is preserved for free. The order
restarts the full 10 seconds when picked up again; there is no partial credit.

**Injected clock.** `Controller` takes `setTimeout`/`clearTimeout` through its constructor and hands
them to each `Bot`. Tests inject a fake clock and advance it instantly, so the suite genuinely
exercises 10-second cooking without waiting for it. The demo injects real timers, so `result.txt`
carries honest wall-clock timestamps.

**A bot owns its timer.** `Bot.startCooking(order, onDone)` takes the order and schedules its own
completion; `stopCooking()` cancels and hands back the unfinished order. The timer is therefore
created and cleared alongside the order it belongs to, and cannot be left dangling — which is the
bug requirement 6 invites, since a destroyed bot's order must never complete later.

**No settable state on the domain objects.** `Order` and `Bot` keep every field private behind
read-only getters, and change state through named methods (`markCompleted()`, `stopCooking()`).
`Bot.status` is derived from whether it holds an order rather than stored, so the two cannot drift.
This matters most for `id` and `type`: `#requeue` restores position by sorting on `id`, and `type`
decides which queue an order joins, so a stray assignment to either would break queueing silently.

**No printing in the core.** `Controller` emits events through an `onEvent` callback; the REPL and
the demo each render them their own way. Adding a third frontend (for example an HTTP server) would
not touch the state machine.

**One caveat.** Order and bot ids come from process-wide static counters, so a second `Controller`
in the same process would continue the same numbering rather than starting fresh. That never happens
here — each entry point builds one controller — but it is why both classes expose a `resetSequence()`
hook that the test setup calls to keep scenarios independent. Per-controller sequences would remove
the hook at the cost of moving id generation back out of the domain objects.

### Test coverage

15 tests over the requirements: VIP/normal ordering, ids unique and increasing, pickup and
completion timing, idle-then-resume, parallel bots, newest-bot-destroyed-first, requeue position,
requeue preserving VIP priority, and cancellation (a destroyed bot's order must never complete
later — the easiest bug to write here).

