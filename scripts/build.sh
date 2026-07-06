#!/bin/bash
echo "Building CLI application..."

set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p bin
go build -o bin/order-controller ./cmd/order-controller

echo "Build completed"