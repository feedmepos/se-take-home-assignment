#!/bin/bash
set -e

# Run Script
# This script executes the CLI application and writes results to scripts/result.txt

echo "Running CLI application..."

# Ensure scripts directory exists (it already does, but this is safe)
mkdir -p scripts

# Run the Node CLI and redirect output
npm start > scripts/result.txt

echo "CLI application execution completed"
