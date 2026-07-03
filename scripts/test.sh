#!/bin/bash
# Test script: run the unit test suite.
set -e
cd "$(dirname "$0")/.."

echo "Running unit tests..."
npm test
echo "Unit tests completed"
