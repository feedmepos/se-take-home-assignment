# Bundled Claude Code capabilities

This repo ships the skills, agents, and commands used to build and maintain the
frontend, so they travel with the project (Claude Code auto-discovers anything
under `.claude/`). Tool-type integrations that can't be a plain file (an LSP, an
MCP server) are wired up separately — see the bottom of this file.

## Skills (`.claude/skills/`)
| Skill | Origin | Purpose |
|---|---|---|
| `frontend-design` | Anthropic official `frontend-design` plugin (`SKILL.md` + `LICENSE.txt` preserved) | Distinctive, production-grade UI; avoids generic "AI-generated" aesthetics. |
| `react-best-practices` | **Authored for this repo** | "Thinking in React": component decomposition, one-way data flow, single source of truth, hooks discipline, a11y floor. (No official React skill exists.) |
| `order-controller-domain` | **Authored for this repo** | The assignment's domain rules + the `(type, id)` priority key and `reconcile` contract, so future changes stay consistent. |

Skills load automatically when a task matches their `description`.

## Agents (`.claude/agents/`) — from the official `pr-review-toolkit` plugin
Run via the `Task` tool or `/agents`. They cover code quality **and** testing review:

| Agent | Reviews for |
|---|---|
| `code-reviewer` | General quality / guideline adherence / bugs |
| `pr-test-analyzer` | Test coverage quality and gaps |
| `type-design-analyzer` | Type encapsulation and invariants |
| `silent-failure-hunter` | Swallowed errors / inadequate error handling |
| `comment-analyzer` | Comment accuracy and rot |
| `code-simplifier` | Simplify/refine recently changed code without changing behavior |

## Commands (`.claude/commands/`)
| Command | Origin | What it does |
|---|---|---|
| `/review-pr` | `pr-review-toolkit` | Orchestrates the agents above for a comprehensive local review (e.g. `/review-pr tests errors`). |
| `/code-review` | `code-review` plugin | Confidence-scored review of a GitHub PR via `gh` (filters false positives). |

## Not vendored as files (different mechanism)
- **`typescript-lsp`** — a language server, not a markdown skill. Keep it as a
  user-level plugin (`/plugin`); it provides type intelligence while editing
  this repo. Nothing to commit.
- **`playwright` MCP** — a browser-automation server, wired up in the repo's
  **`.mcp.json`** (`@playwright/mcp`). It lets Claude drive a real browser for
  visual checks. This is separate from the `@playwright/test` runner used by the
  E2E suite in `e2e/` — the two coexist.

## Provenance & licensing
The `frontend-design` skill, `pr-review-toolkit` agents, and the two commands
are copied from Anthropic's official `claude-plugins-official` marketplace; the
`frontend-design` `LICENSE.txt` is kept alongside its `SKILL.md`. The two
authored skills are original to this repo.
