#!/bin/bash
set -e

# Unit Test Script
# This script executes all Go unit tests in the project

echo "Running unit tests..."
go test ./... -v
echo "Unit tests completed"
