#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Running order controller simulation..."
node dist/simulation.js > scripts/result.txt

echo "CLI application execution completed"
echo "Results written to scripts/result.txt"
