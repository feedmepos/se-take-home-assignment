#!/bin/bash
set -e

# Run Script
# This script executes the CLI application and outputs results to scripts/result.txt and script/result.txt

echo "Running CLI application in simulation mode..."
mkdir -p scripts
mkdir -p script
./order-controller -simulate > scripts/result.txt
cp scripts/result.txt script/result.txt
echo "CLI application execution completed"
