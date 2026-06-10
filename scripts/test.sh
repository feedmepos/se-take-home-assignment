#!/bin/bash

# Unit Test Script
# Runs all Go tests.

set -e

echo "Running unit tests..."

go test ./... -v

echo "Unit tests completed"
