#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESULT_FILE="$ROOT_DIR/scripts/result.txt"

cd "$ROOT_DIR"

if [ ! -d node_modules ]; then
  npm install
fi

npm run demo > "$RESULT_FILE"
