#!/bin/bash
set -euo pipefail

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"
mkdir -p bin
go build -o bin/order-controller ./cmd/order-controller
go build -o bin/order-api ./cmd/api

echo "Build completed"
