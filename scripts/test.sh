#!/bin/bash
set -euo pipefail

# Unit Test Script
# Contains all unit test execution steps

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running unit tests..."

go test ./... -v -count=1

echo "Unit tests completed"
