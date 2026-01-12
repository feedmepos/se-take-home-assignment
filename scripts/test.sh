#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

set -e  # Exit on error

echo "Running unit tests..."

cd feedme-backend

# Ensure the project is built
if [ ! -d "dist" ]; then
    echo "Building application first..."
    if command -v yarn &> /dev/null; then
        yarn build
    else
        npm run build
    fi
fi

# Run tests using Node.js built-in test runner
if [ -f "dist/services/OrderController.test.js" ]; then
    node --test dist/services/OrderController.test.js
else
    echo "Warning: No test files found. Skipping tests."
fi

echo "Unit tests completed"
