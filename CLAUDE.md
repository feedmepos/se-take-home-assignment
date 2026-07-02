# Claude Code Instructions

**IMPORTANT: Read `AGENTS.md` first.** It contains all project knowledge, structure, rules, and architecture that you need before working on this codebase.

## Quick Start

```bash
# Verify everything works
./scripts/build.sh && ./scripts/test.sh && ./scripts/run.sh

# Run tests
node --test tests/test.js            # unit tests
node --test tests/scenario-test.js   # scenario tests

# Run app
node index.js          # scripted simulation
node interactive.js    # interactive CLI
```

## Key Rules

1. **Read `AGENTS.md` before any code changes** — it defines file structure, import paths, and constraints
2. **Zero dependencies** — do not add npm packages
3. **CommonJS only** — `require()` / `module.exports`, no ES modules
4. **Source code in `src/`** — tests in `tests/`, entry points at root
5. **Write agent review logs to `agent-review/`** — each review/test session creates a dated `.md` file as proof of work
6. **Run tests after any change** — `node --test tests/test.js` must pass (35 tests, 0 failures)
7. **Verify CI pipeline after changes** — `./scripts/build.sh && ./scripts/test.sh && ./scripts/run.sh`

## Import Path Reference

```javascript
// From root (index.js, interactive.js):
require('./src/order-controller')

// From tests/ :
require('../src/order-controller')

// Within src/ :
require('./order')
```

## Agent Workflow

See `docs/WORKFLOW.md` for the full agent dispatch workflow. When dispatching test/review agents:
- Each agent must write its log to `agent-review/<role>-YYYY-MM-DD.md`
- Logs must include: steps performed, results, issues found, final verdict
- All agents must reference `AGENTS.md` for project context

## Documentation

| Doc | Purpose |
|-----|---------|
| `AGENTS.md` | Project knowledge for all LLM agents (read first) |
| `docs/REQUIREMENTS.md` | 7 requirements with Mermaid diagrams |
| `docs/TECHNICAL.md` | Architecture, modules, API reference |
| `docs/CLI-DESIGN.md` | CLI visual output specification |
| `docs/PROPOSAL.md` | Design decisions and trade-offs |
| `docs/WORKFLOW.md` | Agent dispatch workflow for testing |
