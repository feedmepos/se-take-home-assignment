#!/bin/bash
# Unit Test Script — runs all Go tests with the race detector.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Running unit tests..."
go test -race -v ./...
echo "Unit tests completed"
