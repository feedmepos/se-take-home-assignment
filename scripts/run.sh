#!/bin/bash

# Run Script
# This script executes the CLI application and outputs results to result.txt

set -e

echo "Running CLI application..."

cd "$(dirname "$0")/.."

# Run the CLI application and output to result.txt
./order-controller > scripts/result.txt

echo "CLI application execution completed"
echo "Results written to scripts/result.txt"
