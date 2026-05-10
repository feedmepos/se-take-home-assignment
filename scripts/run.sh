#!/bin/bash
set -euo pipefail

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

./order-controller demo > scripts/result.txt

echo "CLI application execution completed"
