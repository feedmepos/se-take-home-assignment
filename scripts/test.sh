#!/bin/bash

# Unit Test Script
# This script runs all unit tests under /tests

echo "Running unit tests..."

# Absolute path to /tests (assuming test.sh is inside /scripts)
TEST_DIR="$(dirname "$0")/../tests"

# Loop through all .test.js files
for file in "$TEST_DIR"/*.test.js; do
    if [ -f "$file" ]; then
        echo "Running $file..."
        node "$file"
    fi
done

echo "Unit tests completed successfully!"