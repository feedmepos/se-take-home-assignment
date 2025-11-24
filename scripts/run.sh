#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
# ./order-controller > result.txt

set -e

echo "Running McDonald's Order Management System..."
./order-controller

echo ""
echo "Execution completed!"
echo "Results written to result.txt"

echo "CLI application execution completed"