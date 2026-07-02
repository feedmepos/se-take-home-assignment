#!/bin/bash
set -euo pipefail

# Unit Test Script
# Runs the frontend test suite for the in-memory order controller prototype.

echo "Running frontend unit tests..."

if [ ! -d "node_modules" ]; then
  npm ci
fi

npm run test

echo "Unit tests completed"
