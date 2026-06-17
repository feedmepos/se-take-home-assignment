#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running unit tests..."

npm --prefix "$ROOT_DIR/backend" test

echo "Unit tests completed"
