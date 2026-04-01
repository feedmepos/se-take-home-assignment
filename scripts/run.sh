#!/bin/bash

echo "Running CLI application..."
node dist/index.js --demo > scripts/result.txt 2>&1
echo "CLI application execution completed"
cat scripts/result.txt