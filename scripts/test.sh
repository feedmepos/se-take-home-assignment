#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

# For Go projects:
# go test ./... -v

# For Node.js projects:
# npm test
npx jest

echo "Unit tests completed"
