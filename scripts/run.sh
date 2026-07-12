#!/bin/bash

# Run Script
# Executes the CLI demo and writes timestamped output to scripts/result.txt.

set -e

echo "Running CLI application..."

# Build if the binary is missing (run.sh may be invoked standalone).
if [ ! -x ./order-controller ]; then
  go build -o order-controller ./cmd/order-controller
fi

./order-controller -demo | tee scripts/result.txt

echo "CLI application execution completed"
