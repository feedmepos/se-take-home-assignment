#!/bin/bash
set -e

# Run from repo root (CI invokes ./scripts/build.sh from root).
cd "$(dirname "$0")/.."

echo "Building binaries into bin/..."
go build -o bin/order-cli ./cmd/cli
go build -o bin/order-server ./cmd/server
echo "Build completed"
