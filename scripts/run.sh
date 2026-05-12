#!/bin/bash

# Run Script
# This script executes the CLI application and writes results to result.txt

echo "Running CLI application..."

# Install dependencies
npm install

# Build the project
npm run build

# Run the CLI in demo mode
# The program writes directly to scripts/result.txt via FileLogger
npm start -- --demo

echo "CLI application execution completed"
echo "Results written to scripts/result.txt"
