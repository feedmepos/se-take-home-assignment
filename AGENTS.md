# AGENTS.md

Primary agent-instructions file for this repo. (`CLAUDE.md` imports this via `@AGENTS.md`.)

## Hard rules

- **NEVER overwrite `scripts/result.example.txt`.** It is the employer-provided sample (upstream commit `ce158b7`, authored by FeedMe) and defines the expected output format. It is a spec artifact, not generated output. Our CLI writes to the git-ignored `scripts/result.txt`; match the sample's format there, never edit the sample itself.

## Agent skills

### Issue tracker

GitHub Issues on the fork `jvloo/se-take-home-assignment` via the `gh` CLI (always `--repo` the fork, never upstream). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, default label strings (string = role name). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
