## Implementation Notes & AI Usage

**Architecture**

- Implemented as a small Node.js CLI app with no external dependencies.
- Core domain logic lives in `src/orderController.js`:
  - Maintains separate `pendingVip` and `pendingNormal` queues.
  - Simulates bots that process one order at a time with a configurable processing time (10s).
  - Uses a virtual clock (`timeSec`) and `advanceTimeTo()` to deterministically step through order completion.
- `index.js` contains a deterministic simulation (`runSimulation`) that:
  - Creates Normal and VIP orders.
  - Adds and removes bots (including removing a busy bot and re-queueing its order).
  - Logs the flow in timestamped `[HH:MM:SS]` lines for `scripts/result.txt`.
- Simple unit tests (`node:test`) in `test/orderController.test.js` cover:
  - VIP vs Normal queueing.
  - Order completion after 10 seconds.
  - Re-queuing of an order when the newest busy bot is removed.

**AI Usage**

- I used an AI assistant (ChatGPT) to help draft:
  - The initial project structure (`package.json`, `src/index.js`, `src/orderController.js`, `test/orderController.test.js`).
  - The shell script wiring in `scripts/build.sh`, `scripts/test.sh`, and `scripts/run.sh`.
- I reviewed the generated code, ensured it matches the assignment requirements, and ran:
  - `npm test` to verify unit tests.
  - `npm start` and `./scripts/run.sh` to inspect `scripts/result.txt` and confirm the timestamped output and order/bot behavior.
- No generated code was used without manual review and adjustment.
