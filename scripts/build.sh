#!/bin/bash
set -euo pipefail

echo "Building CLI application..."
cd "$(dirname "$0")/.."
go build -o order-controller ./cmd/main.go
echo "Build completed"
