#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

cd "$(dirname "$0")/.."
npm test

echo "Unit tests completed"
