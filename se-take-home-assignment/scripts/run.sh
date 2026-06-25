#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

set -e

echo "Running CLI application..."

cd "$(dirname "$0")/.."

# Build if needed
if [ ! -f "bin/mcdonald" ]; then
    echo "Building first..."
    go build -o bin/mcdonald ./cmd/cli
fi

# Create result.txt in the scripts directory (for CI verification)
RESULT_FILE="$(pwd)/scripts/result.txt"

# Run with input if provided, otherwise use default demo
if [ -n "$1" ]; then
    echo -e "$1" | ./bin/mcdonald | tee "$RESULT_FILE"
else
    # Default demo: 2 normal orders, 1 vip, 1 bot, status
    printf 'normal\nnormal\nvip\nadd-bot\nstatus\nexit\n' | ./bin/mcdonald | tee "$RESULT_FILE"
fi

echo "CLI application execution completed"