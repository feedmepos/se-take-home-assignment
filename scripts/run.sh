#!/bin/bash
set -euo pipefail

# Run Script
# Executes the CLI application and writes output to result.txt

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running CLI application..."

if [ ! -x "./order-controller" ]; then
  echo "ERROR: order-controller binary not found. Run ./scripts/build.sh first."
  exit 1
fi

./order-controller > scripts/result.txt

echo "CLI application execution completed"
