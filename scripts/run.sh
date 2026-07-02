#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

npm run build
node dist/cli.js --simulate > scripts/result.txt

echo "CLI application execution completed"
exit 0
