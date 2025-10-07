#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."
go test ./order -v

# For Go projects:
# go test ./... -v

# For Node.js projects:
# npm test

echo "Unit tests completed"
