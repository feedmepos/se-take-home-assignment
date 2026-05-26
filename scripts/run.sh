#!/bin/bash
set -e

echo "Running CLI application..."
node scripts/order-controller.js > scripts/result.txt
echo "CLI application execution completed"
