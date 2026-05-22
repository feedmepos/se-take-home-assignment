#!/bin/bash
set -e
# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
# ./order-controller > result.txt
./order-controller > scripts/result.txt 2>&1


echo "CLI application execution completed"