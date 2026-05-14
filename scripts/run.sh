#!/bin/bash

# Run Script
# This script executes the CLI application and outputs results to result.txt

echo "Running CLI application..."

# Run with ts-node (no build required)
npx ts-node src/demo.ts > scripts/result.txt

echo "CLI application execution completed"