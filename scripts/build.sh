#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Building CLI application..."
go build -o "$ROOT/scripts/order-controller" ./cmd/order-controller
echo "Build completed"
