#!/bin/bash

echo "Running CLI application..."
cd "$(dirname "$0")/.."
node main.js > scripts/result.txt
echo "CLI application execution completed"