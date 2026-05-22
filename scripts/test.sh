#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

# Change to project root directory
cd "$(dirname "$0")/.."

# Run simple test runner
npm test

echo "Unit tests completed"
