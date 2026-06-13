#!/bin/bash
set -euo pipefail

# Build Script
# Contains all compilation steps for the CLI application

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Building CLI application..."

go build -o order-controller ./cmd/

echo "Build completed"
