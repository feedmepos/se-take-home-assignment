#!/bin/bash
set -euo pipefail

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

go test ./... -v
go test -race ./test/...

echo "Unit tests completed"
