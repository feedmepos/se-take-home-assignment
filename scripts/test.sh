#!/usr/bin/env bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

# For Go projects:
# go test ./... -v

# For Node.js projects:
set -euo pipefail
npm ci
npm run test

echo "Unit tests completed"
