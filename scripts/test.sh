#!/bin/bash
# test.sh

set -e

echo "Running unit tests..."

# Run tests with verbose output
go test -v ./...

echo "Unit tests completed"