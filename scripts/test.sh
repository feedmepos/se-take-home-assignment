#!/bin/bash
set -euo pipefail

echo "Running unit tests..."
npm ci
npm test
echo "Unit tests completed"
