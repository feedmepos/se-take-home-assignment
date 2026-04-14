#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "Running CLI application..."
./order-controller -demo > "$(dirname "$0")/result.txt"
echo "CLI application execution completed"
