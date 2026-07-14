#!/bin/bash

# Unit Test Script
# Runs all unit tests for the CLI application

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Running unit tests..."

go test ./... -race -v

echo "Unit tests completed"
