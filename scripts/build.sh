#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Building CLI application..."

npm --prefix "$ROOT_DIR/backend" run build

echo "Build completed"
