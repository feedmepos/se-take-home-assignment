#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

set -e  # Exit on error

echo "Running unit tests..."

# Install dependencies first
echo "Installing dependencies..."
npm install

# Run Jest tests
npm test

echo "All unit tests passed successfully!"
