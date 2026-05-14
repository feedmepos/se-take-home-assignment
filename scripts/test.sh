#!/bin/bash
set -e

echo "=========================================="
echo "Running Tests"
echo "=========================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Installing..."
    npm install
    echo ""
fi

# Run tests
echo "Running tests..."
npm test

echo ""
echo "=========================================="
echo "✓ Tests completed"
echo "=========================================="
