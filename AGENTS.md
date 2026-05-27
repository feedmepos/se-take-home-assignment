# AGENTS.md

Primary agent-instructions file for this repo. (`CLAUDE.md` imports this via `@AGENTS.md`.)

## Agent skills

### Issue tracker

GitHub Issues on the fork `jvloo/se-take-home-assignment` via the `gh` CLI (always `--repo` the fork, never upstream). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, default label strings (string = role name). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
