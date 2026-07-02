#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

npm run build
node --test "dist/test/**/*.test.js"

echo "Unit tests completed"
exit 0
