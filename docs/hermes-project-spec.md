# Hermes Project Specification

Hermes is the Node.js backend implementation for the FeedMe Software Engineer take-home assignment. It models the McDonald's order controller as an in-memory CLI application that can run inside GitHub Actions.

## Goals

- Implement the backend option using Node.js.
- Keep the prototype deterministic, easy to test, and easy to explain in an interview.
- Prefer clear domain logic over framework-heavy infrastructure.
- Produce `scripts/result.txt` with meaningful timestamped output in `HH:MM:SS` format.
- Keep the code ready for a later interactive CLI demo.

## Runtime Standard

- Node.js is the only required runtime.
- TypeScript is required for all application source code under `src`.
- Compile TypeScript to CommonJS JavaScript under `dist`.
- Use CommonJS output for compatibility and low ceremony.
- Use no external dependencies unless a later requirement clearly justifies one.
- Keep TypeScript as a dev dependency and avoid runtime dependencies by default.
- Use the built-in `node:test` runner for automated tests.
- Keep all state in memory. No database, file persistence, or network service is required.

## Directory Standard

```text
src/
  cli.ts                     CLI entry point.
  domain/                    Pure order-controller state and rules.
  scenarios/                 Deterministic scripted demos for CI output.
dist/                        Generated JavaScript build output.
test/                        Unit and behavior tests.
docs/                        Planning, project rules, and implementation notes.
scripts/
  test.sh                    GitHub Actions test entry point.
  build.sh                   GitHub Actions build/check entry point.
  run.sh                     GitHub Actions run entry point; writes scripts/result.txt.
```

## Domain Rules

- Order numbers must be unique and strictly increasing.
- Pending orders are sorted by priority:
  - VIP orders before normal orders.
  - FIFO order within VIP orders.
  - FIFO order within normal orders.
- A bot can process one order at a time.
- Processing takes 10 simulated seconds.
- A newly added idle bot should immediately pick up pending work when available.
- If no work is available, a bot remains idle.
- Removing a bot destroys the newest bot.
- If the newest bot is processing, the interrupted order returns to the pending queue under the same priority rules.

## CLI Contract

- `npm test` compiles TypeScript and runs automated tests.
- `npm run test:output` compiles TypeScript and validates the CLI stdout contract.
- `npm run build` compiles TypeScript with strict checking.
- `npm run cli` runs the compiled CLI directly.
- `npm run cli:interactive` starts the command-driven interactive CLI.
- `npm start` prints a deterministic simulation from `dist/cli.js` to stdout.
- `scripts/run.sh` writes the simulation output to `scripts/result.txt`.
- Every meaningful event line should include `[HH:MM:SS]`.

## Required Commands

```bash
npm install
npm run build
npm test
npm run test:output
npm run cli
npm run cli:interactive
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

## Required Output Tests

- Test coverage must include domain behavior tests and CLI output tests.
- CLI output tests must execute `node dist/cli.js` and assert meaningful stdout.
- Output tests must verify timestamp formatting and key scenario events.
- `scripts/result.txt` must be produced by `./scripts/run.sh` from the compiled CLI.

## Interactive Command Contract

- `normal` creates a normal order.
- `vip` creates a VIP order.
- `bot+` adds a cooking bot.
- `bot-` removes the newest cooking bot.
- `tick <seconds>` advances simulated time and triggers due completions.
- Interactive mode must also advance with real elapsed time, so processing orders complete automatically after 10 seconds without requiring `tick`.
- `status` prints bots, pending orders, processing orders, and completed count.
- `help` prints available commands.
- `exit` or `quit` closes the session.

## Engineering Style

- Keep functions small and named after the domain behavior they perform.
- Put pure business rules in `src/domain`, not inside shell scripts.
- Keep exported TypeScript types close to the domain objects they describe.
- Avoid real timers in tests and CI scenarios. Use simulated time so the suite is fast and deterministic.
- Add comments only when the logic is non-obvious.
- Keep user-facing output concise and interview-readable.
