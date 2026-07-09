#!/bin/bash
set -e

# Build first
bash scripts/build.sh

# Run simulation and write output to scripts/result.txt
echo "Running simulation..."
./app simulate | tee scripts/result.txt

echo "Done. Output saved to scripts/result.txt"
