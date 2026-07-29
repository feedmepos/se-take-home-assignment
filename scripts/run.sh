#!/bin/bash
set -euo pipefail
echo "Running CLI application..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
"$ROOT_DIR/bin/order-controller" -demo -process-time=100ms > "$SCRIPT_DIR/result.txt"
echo "CLI application execution completed"
