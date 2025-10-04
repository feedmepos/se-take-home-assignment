#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

node tests/orderManager.test.js > scripts/result.txt
node tests/botManager.test.js >> scripts/result.txt

echo "CLI application execution completed"