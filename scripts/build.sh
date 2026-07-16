#!/bin/bash
set -euo pipefail

echo "Building CLI application..."
mkdir -p bin
go build -o bin/order-controller ./cmd/order-controller
echo "Build completed"
