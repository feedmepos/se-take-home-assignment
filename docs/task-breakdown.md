# Task Breakdown

## Phase 1 - Foundation

- Create a Node.js implementation branch.
- Initialize package metadata and npm scripts.
- Require TypeScript for Node application source code.
- Define Hermes project structure and coding standard.
- Replace placeholder scripts with Node-backed CI entry points.
- Add smoke tests for queue priority, order numbers, bot removal, timestamp formatting, and CLI output.
- Document required npm commands and assignment scripts.

## Phase 2 - Domain Completion

- Expand the order controller to support automatic scheduling across multiple bots.
- Model simulated processing time as deterministic events instead of real `setTimeout` delays.
- Preserve order priority when interrupted processing returns to pending.
- Add tests for multiple bots, idle bots, VIP ordering, and interrupted orders.

## Phase 3 - CLI Prototype

- Add a scripted scenario that demonstrates all README requirements.
- Ensure `scripts/run.sh` writes `scripts/result.txt`.
- Make `result.txt` include enough events to prove the control flow.
- Keep output timestamped in `HH:MM:SS`.
- Keep CLI stdout covered by output contract tests.

## Phase 4 - Interview Readiness

- Add interactive CLI command handling for the next-round demo.
- Document available commands such as `normal`, `vip`, `bot+`, `bot-`, `status`, and `exit`.
- Keep `docs/cli-commands.md` current with all runnable commands.
- Add README implementation notes and run instructions.
- Run `scripts/test.sh`, `scripts/build.sh`, and `scripts/run.sh` before PR submission.
