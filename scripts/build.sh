#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

echo "Building CLI application..."
mkdir -p bin
go build -o bin/order-controller .
echo "Build completed: $REPO_DIR/bin/order-controller"
