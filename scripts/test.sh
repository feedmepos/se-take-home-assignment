#!/bin/bash

# Unit Test Script
# Runs the Go unit tests with the race detector.

set -e

echo "Running unit tests..."

go test ./... -v -race

echo "Unit tests completed"
