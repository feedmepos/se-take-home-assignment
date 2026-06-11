#!/bin/bash
# Run Script — builds the CLI and feeds it a demo command script,
# capturing the output in scripts/result.txt for CI verification.
#
# Processing time defaults to the required 10s per order (total run
# ~35s). For a quick local check: PROCESS_SECONDS=1 ./scripts/run.sh
# (the demo's `wait 1` then overlaps completions, but `drain` keeps the
# end state correct).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Running CLI application..."
go build -o bin/order-controller ./cmd/order-controller

# Demo walkthrough:
#   1. Normal #1 and VIP #2 arrive; VIP queues ahead of Normal.
#   2. bot 1 picks VIP #2, bot 2 picks Normal #1.
#   3. VIP #3 arrives while both bots are busy -> stays PENDING.
#   4. -bot destroys bot 2 mid-processing -> Normal #1 returns to
#      PENDING behind VIP #3 (priority preserved).
#   5. drain: bot 1 finishes #2, picks #3, finishes it, picks #1,
#      finishes it, then goes IDLE.
./bin/order-controller > scripts/result.txt <<'EOF'
normal
vip
+bot
+bot
vip
wait 1
-bot
drain
status
quit
EOF

echo "CLI application execution completed"
