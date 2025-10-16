#!/bin/bash

# Unit Test Script
# This script runs E2E tests to verify the candidate's API implementation

echo "Running E2E tests..."

# Navigate to e2e_test directory and run tests
cd "$(dirname "$0")/../e2e_test" || exit 1

# Run tests with verbose output
# Use -short flag to skip time-consuming tests during quick validation
go test -v -short ./...

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✓ All E2E tests passed"
else
    echo "✗ Some E2E tests failed"
fi

exit $TEST_EXIT_CODE
