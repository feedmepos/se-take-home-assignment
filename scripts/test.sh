#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

cd "$(dirname "$0")/.."

go test ./service -v -race -timeout 120s

if [ $? -eq 0 ]; then
    echo "Unit tests completed successfully"
else
    echo "Unit tests failed"
    exit 1
fi
