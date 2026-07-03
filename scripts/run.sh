#!/bin/bash
# Run script: execute the simulation and write timestamped output to result.txt.
set -e
cd "$(dirname "$0")/.."

echo "Running CLI application..."
node src/index.js > scripts/result.txt
echo "CLI application execution completed"

echo "----- result.txt -----"
cat scripts/result.txt