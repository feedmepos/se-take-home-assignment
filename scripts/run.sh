#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# npm run dev 2>&1 | tee scripts/result.txt
npm run dev 2>&1 | while IFS= read -r line; do
  printf '%s - %s\n' "$(date +%H:%M:%S)" "$line"
done > scripts/result.txt

echo "CLI application execution completed"