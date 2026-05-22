#!/bin/bash

# Run Script - Execute CLI application and output to result.txt
echo "Running CLI application..."

# Execute the Node.js application and save output to result.txt
node index.js > scripts/result.txt

echo "CLI application execution completed"
echo "Results saved to scripts/result.txt"
