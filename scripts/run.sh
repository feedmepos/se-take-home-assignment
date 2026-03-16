#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

set -e

echo "Running CLI application..."

# Build if binary doesn't exist
if [ ! -f bin/order-manager ]; then
    echo "Binary not found, building..."
    ./scripts/build.sh
fi

# In CI (no TTY), pipe commands so the app runs and creates scripts/result.txt
# In terminal (TTY), run interactively so user sees the menu
if [ -t 0 ] && [ -t 1 ]; then
    ./bin/order-manager
else
    echo -e "1\n1\n2\n3\n5\n7" | ./bin/order-manager > /dev/null 2>&1 || true
fi

echo "CLI application execution completed"
