#!/bin/bash

# Test Script - Run all unit tests
# Usage:
#   ./test.sh           # Run all tests with verbose output
#   ./test.sh --race    # Run with race detector

set -e

EXTRA_FLAGS=""
if [ "$1" = "--race" ]; then
    EXTRA_FLAGS="-race"
fi

echo "Running unit tests..."
go test ./... -v ${EXTRA_FLAGS}
echo "All tests passed!"
