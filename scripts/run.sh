#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# Change to project root directory
cd "$(dirname "$0")/.."

# Detect OS and set executable name
OS=$(uname -s 2>/dev/null || echo "Windows")
if [ "$OS" = "Linux" ] || [ "$OS" = "Darwin" ]; then
    EXECUTABLE="./order-controller"
else
    EXECUTABLE="./order-controller.exe"
fi

# For Go projects:
if [ -f "$EXECUTABLE" ]; then
    echo -e "new-normal\nnew-vip\n+bot\nstatus\nhelp\n-bot\nexit" | "$EXECUTABLE" > ./result.txt
else
    echo "Error: order-controller executable not found. Please run build.sh first."
    exit 1
fi

echo "CLI application execution completed"
echo "Output saved to result.txt"
