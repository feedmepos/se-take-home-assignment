#!/bin/bash
# Add local Go to PATH
export PATH=$PATH:$(pwd)/tools/go/bin

echo "Running simulation..."
cd backend
if command -v go &> /dev/null; then
    go run . -simulation
else
    echo "Error: 'go' command not found."
    exit 1
fi