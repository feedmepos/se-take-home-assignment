#!/bin/bash
set -euo pipefail

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

./order-controller --demo --process-duration=500ms > scripts/result.txt

echo "CLI application execution completed"
