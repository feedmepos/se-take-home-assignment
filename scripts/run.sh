#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

set -e  # Exit on error

echo "Running CLI application..."

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Execute the CLI application
# Output is written to scripts/result.txt by the application itself
node dist/main.js --cli

# Verify result.txt was created
if [ -f "scripts/result.txt" ]; then
    echo "CLI application execution completed successfully!"
    echo "Results written to scripts/result.txt"
else
    echo "Error: result.txt was not created"
    exit 1
fi