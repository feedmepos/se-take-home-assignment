#!/bin/bash
# Unit Test Script -- runs the Node.js unit tests (node:test runner).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND="$ROOT/codes/backend"

echo "Running unit tests..."
cd "$BACKEND"

npm test

echo "Unit tests completed"
