#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

# For Go projects:
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$ROOT_DIR"

echo "Using Go: $(go version)"
mkdir -p bin
go build -o bin/order-controller ./cmd/order-controller

# For Node.js projects:
# npm install
# npm run build (if needed)

echo "Build completed: bin/order-controller"