#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running CLI application..."

./order-controller > scripts/result.txt

echo "CLI application execution completed"
