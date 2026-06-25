#!/bin/bash
# Test script for McDonald CLI

set -e

echo "Running tests for McDonald CLI..."

cd "$(dirname "$0")/.."

# Run unit tests
echo "=== Running Unit Tests ==="
go test -v ./...

# Check coverage
echo ""
echo "=== Test Coverage ==="
go test -cover ./...

echo ""
echo "All tests passed!"
