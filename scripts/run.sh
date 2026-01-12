#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

set -e  # Exit on error

echo "Running CLI application..."

cd feedme-backend

# Ensure the project is built
if [ ! -d "dist" ] || [ ! -f "dist/cli.js" ]; then
    echo "Building application first..."
    if command -v yarn &> /dev/null; then
        yarn build
    else
        npm run build
    fi
fi

# Run the compiled CLI application
node dist/cli.js > ../scripts/result.txt 2>&1

echo "CLI application execution completed"