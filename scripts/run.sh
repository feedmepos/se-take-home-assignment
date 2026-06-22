#!/bin/bash
set -e
echo "Running CLI application..."
./order > scripts/result.txt
echo "Output written to scripts/result.txt"