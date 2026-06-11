#!/bin/bash
set -e
echo "Running CLI application..."
./order-controller > scripts/result.txt
echo "Output written to scripts/result.txt"