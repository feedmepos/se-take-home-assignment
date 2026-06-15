#!/bin/bash
set -euo pipefail

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"
go test ./... -v

echo "Unit tests completed"
