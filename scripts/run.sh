#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
# ./order-controller > result.txt

# For Node.js projects:
set -euo pipefail
npm ci
npm run build
node dist/index.js > result.txt
echo "Wrote result.txt"

# Temporary placeholder - remove this when you implement your CLI
# echo "Added 1 bot" > result.txt
# echo "status: bot: [1], order: []" >> result.txt

echo "CLI application execution completed"