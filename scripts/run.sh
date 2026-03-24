#!/bin/bash

# Run Script
# This script executes the CLI application and outputs results to result.txt

echo "Running CLI application..."

# For Go projects:
# Clear and execute the order-controller, redirecting output to result.txt
./order-controller > scripts/result.txt 2>&1

echo "CLI application execution completed"
echo "Results saved to scripts/result.txt"