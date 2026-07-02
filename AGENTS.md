# Repository Guidelines

## Project Structure & Module Organization

```
src/
  domain/          Core domain logic (types, logger, OrderController)
  test/            Unit tests (node:test)
  cli.ts           Interactive stdin CLI entry point
  simulate.ts      --simulate script mode for CI
scripts/           CI entry points (build.sh, test.sh, run.sh)
dist/              tsc build output (gitignored)
```

The domain layer (src/domain/) is shared by both CLI modes and has no I/O dependencies. OrderController is the central class; it accepts an injectable Scheduler so tests avoid real 10-second waits.

## Build, Test, and Development Commands

`npm run build` — compile TypeScript to dist/ via tsc
`npm test` — build then run unit tests with node --test
`npm start` — run the interactive CLI (stdin commands)
`npm run simulate` — run the scripted scenario, prints timestamped output to stdout

CI scripts (scripts/) run on ubuntu-latest with Node 22.19.0:
scripts/test.sh — build + run tests
scripts/build.sh — npm install + npm run build
scripts/run.sh — build + --simulate redirected to scripts/result.txt

## Coding Style & Naming Conventions

TypeScript strict mode, ES Modules ("type": "module"). 2-space indentation, semicolons required. Use .js extensions in relative imports (NodeNext module resolution). PascalCase for classes/interfaces/types, camelCase for functions/variables. No runtime dependencies; typescript and @types/node are devDependencies only.

## Testing Guidelines

Framework: Node built-in node:test + node:assert/strict. Tests live in src/test/ and mirror the domain module name (e.g. orderController.test.ts). Use FakeScheduler to fire completion callbacks synchronously — never wait real time in tests. Run: npm run build && npm test.

## Commit & Pull Request Guidelines

Use Conventional Commits: feat:, fix:, docs:, refactor:. Example: feat: implement Node.js TypeScript CLI for McDonald's order controller. Branch naming: codex/<topic> for Codex-generated branches, or <type>/<topic> generally. PRs must pass the backend-verify-result workflow (tests, build, result.txt timestamp check). Keep changes scoped; avoid unrelated refactors in the same PR.
