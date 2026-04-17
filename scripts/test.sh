#!/bin/bash

set -e

echo "Installing dependencies..."
npm install

echo "Running unit tests..."
npm test

echo "Generating result.txt..."
npx tsx src/cli.ts --simulate < scripts/simulation.input > scripts/result.txt

echo "Unit tests completed"
