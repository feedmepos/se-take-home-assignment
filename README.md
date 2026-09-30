# FeedMe order controller

A Node.js 22 command line prototype for the cooking bot assignment. Orders and bots live in memory; no installation, database, or external packages are needed.

## Run it

```sh
./scripts/test.sh   # unit tests
./scripts/build.sh  # syntax check; JavaScript needs no compilation
./scripts/run.sh    # real-time demo; writes scripts/result.txt in about 20 seconds
npm start           # interactive CLI
```

In interactive mode, enter one command per line:

| Command | Action |
| --- | --- |
| `normal` | Add a normal order |
| `vip` | Add a VIP order |
| `+ bot` | Add a bot and immediately assign the next pending order |
| `- bot` | Remove the newest bot and requeue its unfinished order |
| `status` | Show pending, processing, complete, and bot state |
| `help` | Show commands |
| `quit` | Stop the CLI and cancel active work |

Commands are case insensitive. `+bot`, `-bot`, `add bot`, and `remove bot` are also accepted. A bot takes 10 real seconds per order. The demo uses the same controller and waits for all four example orders to finish. Every output line includes a UTC `HH:MM:SS` timestamp.

## Behavior

Pending orders are ordered by priority (VIP first), then by increasing order ID. Bots take orders from the front. An order currently being cooked is shown separately as `PROCESSING`; it cannot be preempted by a new VIP order. When the newest bot is removed, its timer is cancelled and its order is inserted back in its original FIFO position within its priority class. Other available bots can pick it up immediately. Completed orders stay in completion order. Order and bot IDs are never reused during a run.

The controller is in `src/controller.js`, and the interactive/demo CLI is in `src/cli.js`. `test/controller.test.js` uses an injected clock to check exact 10-second boundaries, priority, cancellation, concurrent bots, and idle behavior without slowing down the test script.

The supplied GitHub Actions workflow calls the scripts in `scripts/` and verifies `scripts/result.txt`. The assignment text calls this directory `script/`, but the repository's workflow uses `scripts/`, so the implementation follows the executable workflow path.
