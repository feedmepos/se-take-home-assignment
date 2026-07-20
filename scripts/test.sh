#!/bin/bash
set -e

# Run from repo root (CI invokes ./scripts/test.sh from root).
cd "$(dirname "$0")/.."

echo "Running unit tests..."
go test ./... -v
echo "Unit tests completed"
