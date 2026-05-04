#!/bin/bash

# Unit Test Script
# This script contains all unit test execution steps

echo "Running unit tests..."

cd "$(dirname "$0")/.."

go test ./... -v

echo "Unit tests completed"
