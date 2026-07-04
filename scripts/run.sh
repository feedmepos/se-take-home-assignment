#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
# First build the program
if [ ! -f "./order-controller" ]; then
    go build -o order-controller ./cmd/main.go
fi

# Run the program and output to scripts/result.txt
./order-controller --demo > scripts/result.txt

echo "CLI application execution completed"