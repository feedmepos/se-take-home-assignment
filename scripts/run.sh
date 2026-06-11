#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

BIN="$REPO_DIR/bin/order-controller"
if [ ! -x "$BIN" ]; then
    echo "Binary not found; building first..."
    ./scripts/build.sh
fi

echo "Running CLI application (demo mode)..."
"$BIN" --demo > "$SCRIPT_DIR/result.txt"
echo "CLI application execution completed; output written to $SCRIPT_DIR/result.txt"
