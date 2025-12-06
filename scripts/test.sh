#!/bin/bash
# Unit Test Script
set -e

echo "Running unit tests..."

if [ -f package.json ]; then
  npm install
  npm test
else
  echo "No package.json found, skipping tests."
fi

echo "Unit tests completed"
