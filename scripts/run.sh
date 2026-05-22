#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# Change to project root directory
cd "$(dirname "$0")/.."

# Run the Node.js CLI application and redirect output to result.txt in scripts directory
node src/index.js > scripts/result.txt 2>&1
# node src/index.js --interactive

echo "CLI application execution completed"