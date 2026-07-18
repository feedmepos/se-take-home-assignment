#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
./order-controller > scripts/result.txt

# For Node.js projects:
# node index.js > scripts/result.txt
# or npm start > scripts/result.txt

echo "CLI application execution completed"