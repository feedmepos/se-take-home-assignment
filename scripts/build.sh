#!/bin/bash
# Build Script — compiles the CLI into bin/order-controller.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building CLI application..."
go build -o bin/order-controller ./cmd/order-controller
echo "Build completed"
