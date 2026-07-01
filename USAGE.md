# Usage Guide

How to run the McDonald's Order Controller. There are three npm commands, each
for a different purpose.

## Prerequisites

- **Node.js** (v18 or newer). No installation of dependencies is required — the
  project uses only Node's built-in modules.
- From the project root, you can optionally run `npm install` first (it does
  nothing but confirm there are no third-party packages).

## Commands at a glance

| Command | Purpose | Interactive? | Duration |
|---|---|---|---|
| `npm start` | Play with the system yourself by typing commands | ✅ Yes | until you `exit` |
| `npm run scenario` | Watch a fixed, self-running demo of every feature | ❌ No | ~27 seconds |
| `npm test` | Run the automated unit tests that verify all the rules | ❌ No | instant |

---

## `npm start` — interactive CLI

Launches a hands-on session where **you** drive the kitchen. Type a command and
press Enter to see the system react in real time (orders take a real 10 seconds
to cook).

```bash
npm start
```

Available commands once it's running:

| Type this | What it does |
|---|---|
| `normal` | Create a new **Normal** order (joins the PENDING area) |
| `vip` | Create a new **VIP** order (jumps ahead of Normal orders, behind earlier VIPs) |
| `+bot` | Add a cooking bot — it immediately starts cooking the next pending order |
| `-bot` | Remove the newest bot — if it was cooking, that order returns to PENDING |
| `status` | Print the current PENDING / bot / COMPLETE state |
| `help` | Show the command list |
| `exit` | Quit |

Use this when you want to **explore and test the behaviour manually**.

---

## `npm run scenario` — automated demonstration

Runs a pre-scripted story (no input needed) that exercises every requirement:
VIP priority, unique order numbers, adding/removing bots, an order being returned
to the queue when a bot is removed, and bots going idle. It prints a timestamped
log and exits.

```bash
npm run scenario
```

This is also what powers `scripts/run.sh` (which saves the same output to
`scripts/result.txt`). Because it uses **real 10-second timers**, the printed
`HH:MM:SS` timestamps reflect genuine cook times, and the whole run takes ~27s.

Use this when you want a **quick, repeatable proof that everything works** end to
end, without typing anything.

---

## `npm test` — unit tests

Runs the automated test suite (`node --test`) that checks each rule in isolation:
order numbering, VIP queue position, the 10-second processing, bots going idle,
removing the newest bot, returning an in-progress order to its correct spot, and
parallel cooking with multiple bots.

```bash
npm test
```

The tests use a **fake clock**, so they finish instantly instead of waiting real
seconds. Expect output ending in something like `# pass 10  # fail 0`.

Use this to **confirm the logic is correct** after any code change.

---

## Shell scripts (used by CI)

The GitHub Actions workflow runs the same things via the `scripts/` folder:

| Script | Runs | Equivalent to |
|---|---|---|
| `scripts/test.sh` | the unit tests | `npm test` |
| `scripts/build.sh` | dependency install (no compile — JS is interpreted) | `npm install` |
| `scripts/run.sh` | the scenario, saving output to `scripts/result.txt` | `npm run scenario` |
