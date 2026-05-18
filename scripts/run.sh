#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Running CLI application..."

# Fast cook time for CI; use e.g. -duration 10s for a real-time demo locally.
"$ROOT/scripts/order-controller" -duration 10ms > "$ROOT/scripts/result.txt"

echo "CLI application execution completed"
