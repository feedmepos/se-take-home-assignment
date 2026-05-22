#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

# Run tests for the code package
go test ./code/... -v

echo "Unit tests completed"