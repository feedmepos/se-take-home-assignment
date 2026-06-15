#!/bin/bash
set -euo pipefail

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"
if [ ! -x "bin/order-controller" ]; then
  go build -o bin/order-controller ./cmd/order-controller
fi

bin/order-controller --demo > "$SCRIPT_DIR/result.txt"

echo "CLI application execution completed. Result written to scripts/result.txt"
