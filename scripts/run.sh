#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESULT_FILE="$ROOT_DIR/scripts/result.txt"
cd "$ROOT_DIR"

echo "Running CLI application..."

npm run --silent backend:run > "$RESULT_FILE"
cat "$RESULT_FILE"

echo "CLI application execution completed"
