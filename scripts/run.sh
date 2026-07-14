#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "Running CLI application..."
./order-controller > scripts/result.txt
echo "CLI application execution completed"
