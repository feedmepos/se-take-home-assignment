#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
# ./order-controller > result.txt

# For Node.js projects:
# node index.js > result.txt
# or npm start > result.txt
node index.js > ./scripts/result.txt

# Temporary placeholder - remove this when you implement your CLI
# echo "Added 1 bot" > ./scripts/result.txt
# echo "status: bot: [1], order: []" >> ./scripts/result.txt

# echo "CLI application execution completed"