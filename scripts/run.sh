#!/bin/bash
# Run Script
set -e

echo "Running CLI application..."

# รัน index.js แล้ว redirect output ไปที่ scripts/result.txt
node index.js > scripts/result.txt

echo "CLI application execution completed"
