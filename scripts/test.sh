#!/bin/bash

# Unit Test Script
# Runs the controller test suite. The tests inject a fake clock, so the full
# suite finishes in milliseconds despite the 10-second cooking time.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "Running unit tests..."
npm test
echo "Unit tests completed"
