# AGENTS.md

Tool-neutral engineering standards for this repo — the "what good looks like"
that any agent or human follows. Operational details (commands, workflow) live
in `CLAUDE.md`; this file is intentionally about **code quality**, not process.

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- No `any`. No non-null `!` assertions — narrow properly. No type assertions
  (`as`) except at genuine I/O boundaries (there are none in the core).
- Model state with **discriminated unions**, not boolean soup:
  `type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE"`.
- Prefer `readonly` fields and `ReadonlyArray<T>` in the core. State transitions
  return **new** objects; never mutate in place.
- Functions are small and single-purpose. Pure where they can be pure.

## Naming & files

- Files: `kebab-case.ts` / `kebab-case.tsx`. One primary export per file.
- Types/components: `PascalCase`. Functions/vars: `camelCase`. Constants: `UPPER_SNAKE`.
- Names state intent: `pickNextOrder`, not `getOrder2`. No abbreviations beyond
  the domain's own (`VIP`).

## Layering (enforced)

```
core (pure)  →  store (bridge)  →  components (presentation)
```

Dependencies point one direction only. The core imports nothing from `store` or
`components`. Components never import from `core` directly except its **types**;
all behaviour goes through the store bridge.

## Error handling & invariants

- Validate at boundaries (UI inputs / public controller methods); trust internal
  callers. Don't sprinkle defensive checks through pure helpers.
- Encode invariants as code, not comments where possible (e.g. the queue is kept
  sorted by construction, so re-insertion is correct by definition).
- No silent catches. If something can't happen, make it unrepresentable in types.

## Comments & docs

- Comment the **why**, never the **what**. Code says what; comments justify
  non-obvious decisions (e.g. why the snapshot reference must be cached).
- Every public core method gets a one-line TSDoc describing its contract.

## Testing

- Pure logic is unit-tested directly; UI is covered by one Playwright happy path.
- Tests assert behaviour and invariants, not implementation details.
- Deterministic time via fake timers — no real waits. Details in
  `.claude/patterns/testing.md`.

## Commits & PRs (GitHub Flow)

- Conventional Commits: `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`.
- One logical change per commit; each commit builds & passes typecheck/lint.
- Work on a feature branch; open a PR into your fork with a short description of
  approach and the design decisions. Keep the diff reviewable.

## Self-review checklist before commit

- [ ] Does any component contain a decision that belongs in the core? Move it.
- [ ] Any `any`, `!`, stray `as`, or mutation of shared state? Remove it.
- [ ] New dependency? Justify it in `PROGRESS.md` or drop it.
- [ ] Is this the simplest thing that satisfies the PRD? Cut cleverness.
- [ ] Names readable to someone seeing this for the first time?
