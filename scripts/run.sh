#!/bin/bash
# Run Script -- executes the CLI demo scenario and writes timestamped output
# to scripts/result.txt (HH:MM:SS timestamps, as required).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND="$ROOT/codes/backend"
RESULT="$SCRIPT_DIR/result.txt"

echo "Running CLI application..."
cd "$BACKEND"

# Each order takes the full 10 seconds required by the assignment.
# (Override with e.g. PROCESS_MS=300 for a fast local run.)
node src/demo.js | tee "$RESULT"

echo "CLI application execution completed"
echo "Results written to $RESULT"
