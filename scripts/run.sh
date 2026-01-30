#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Installing dependencies..."
npm install

echo "Running CLI application..."

# For Go projects:
# ./order-controller > result.txt

# For Node.js projects:
echo "Running CLI simulation..."
npm run start:cli

echo "CLI application execution completed"