#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

set -e

echo "Running unit tests..."

go test ./... -race -v

echo "Unit tests completed"
