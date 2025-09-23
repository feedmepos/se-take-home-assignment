#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Node.js projects:
node index.js > scripts/result.txt 2>&1

echo "CLI application execution completed"