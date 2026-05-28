#!/bin/bash
set -e

# Run Script
# This script executes the CLI application and outputs results to scripts/result.txt

echo "Running CLI application in simulation mode..."
./order-controller -simulate > scripts/result.txt
echo "CLI application execution completed"