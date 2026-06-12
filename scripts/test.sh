#!/bin/bash

# CI Test Script - Runs all Go unit tests

set -e

echo "Running unit tests..."
go test ./... -v
echo "All tests passed!"
