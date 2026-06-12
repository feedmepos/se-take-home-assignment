#!/bin/bash

# CI Run Script - Executes demo mode, outputs to scripts/result.txt

set -e

echo "Running CLI application in demo mode..."
./scripts/order-controller --demo > scripts/result.txt 2>&1
echo "Results written to scripts/result.txt"
