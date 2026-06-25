#!/bin/bash

# Test Script
# This script should contain all unit test execution steps

set -e

cd "$(dirname "$0")/.."

echo "Running unit tests..."

# For Go projects:
go test ./... -v

echo "Unit tests completed"
