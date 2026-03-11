#!/bin/bash

# Unit Test Script
# This script contains all unit test execution steps

set -e

echo "Running unit tests..."

cd "$(dirname "$0")/.."

# Run Go tests with verbose output
go test ./... -v -timeout 60s

echo "Unit tests completed successfully"
