# FeedMe order controller

An in-memory Node.js CLI for the cooking bot assignment. Requires Node.js 22 or newer; no packages need to be installed.

## Run

```sh
./scripts/test.sh
./scripts/build.sh
./scripts/run.sh
```

`run.sh` runs a 10-second demo and writes its timestamped events and final state to `scripts/result.txt`. Run `./scripts/run.sh --interactive` to enter commands from a terminal (the session is also recorded in `scripts/result.txt`). You can also run `node src/cli.js` directly without writing a file.

| Command | Action |
| --- | --- |
| `normal` or `new normal order` | Add a normal order |
| `vip` or `new vip order` | Add a VIP order |
| `+` or `+ bot` | Add a bot |
| `-` or `- bot` | Remove the newest bot |
| `status` | Show pending, processing, complete, and bots |
| `help` | Show commands |
| `quit` | End the session |

Example: enter `normal`, `vip`, `+`, `status`, wait ten seconds, then enter `status` again. Commands can also be piped into the CLI for automation.

## Behavior

Orders receive increasing IDs. The pending queue puts VIP orders first and preserves arrival order within each class. Idle bots take the next pending order immediately. An order leaves `PENDING` while processing, enters `COMPLETE` after ten seconds, and then its bot takes the next order or becomes idle. Removing the newest busy bot cancels its timer and reinserts its order by original ID within its priority class. If another bot later picks it up, the ten-second processing period starts again. State is held only in memory and resets when the process exits.

The tests use a controlled clock to check the ten-second boundary, priority, cancellation, and idle behavior without waiting in real time. The demo uses real timers and produces the result file required by the GitHub Actions workflow.
