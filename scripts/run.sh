#!/bin/bash

set -e

echo "Running CLI application..."
npx tsx src/cli.ts --simulate < scripts/simulation.input > scripts/result.txt

echo "CLI application execution completed"
