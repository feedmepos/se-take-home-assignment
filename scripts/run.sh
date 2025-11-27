#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

npm run dev 2>&1 | tee scripts/result.txt

echo "CLI application execution completed"