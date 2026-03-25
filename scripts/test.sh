#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

npm install
npx vitest run

echo "Unit tests completed"
