#!/bin/bash
set -euo pipefail

echo "Running CLI application..."
cd "$(dirname "$0")/.."

# Build first
./scripts/build.sh

# Run in simulation mode and output to result.txt
./order-controller --simulate > scripts/result.txt

echo "CLI application execution completed"
