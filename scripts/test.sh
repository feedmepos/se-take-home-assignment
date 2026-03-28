#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed or not in PATH"
    exit 1
fi

# For Go projects:
cd .. && go test ./... -v

if [ $? -eq 0 ]; then
    echo "All tests passed"
else
    echo "Some tests failed"
    exit 1
fi

echo "Unit tests completed"
