#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

cd "$(dirname "$0")/.."
node dist/index.js --run > scripts/result.txt

echo "CLI application execution completed"