#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULT_FILE="$ROOT/result.txt"

echo "==> Running Kitchen Chaos simulation..."
echo "    Output → $RESULT_FILE"
echo "    Bot processing time: ${BOT_PROCESSING_TIME:-10000} ms"

cd "$ROOT/backend"

# Run the CLI in simulate mode; output goes to result.txt at repo root
BOT_PROCESSING_TIME="${BOT_PROCESSING_TIME:-10000}" \
  node src/index.js --simulate "$RESULT_FILE"

echo ""
echo "==> Simulation complete. Contents of result.txt:"
echo "──────────────────────────────────────────────────"
cat "$RESULT_FILE"
echo "──────────────────────────────────────────────────"
