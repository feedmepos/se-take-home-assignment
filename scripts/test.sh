#!/bin/bash
set -euo pipefail

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

GOCACHE="$(pwd)/.cache/go-build" go test ./... -v

echo "Unit tests completed"
