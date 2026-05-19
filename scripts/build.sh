#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Building CLI application..."
go build -o order-controller ./cmd/main.go
echo "Build completed"
