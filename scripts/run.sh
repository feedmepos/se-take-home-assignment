#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# Change to project root directory
cd "$(dirname "$0")/.." || exit 1

# For Go projects:
./order-controller

echo "CLI application execution completed"