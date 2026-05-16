#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

cd "$(dirname "$0")/.."

if [[ "$1" == "--interactive" || "$1" == "-i" ]]; then
  echo "Starting interactive mode..."
  node index.js --interactive 
else
  echo "Running CLI application..."
  node index.js > scripts/result.txt
  echo "CLI application execution completed"
fi