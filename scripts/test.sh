#!/bin/bash
set -e
echo "Building CLI application..."
npm install
./node_modules/.bin/tsc
echo "Build completed"

echo "Running CLI simulation tests..."

# Clear old result
> scripts/result.txt

# Simulate user actions; sleep 11s after adding bots so the 10s processing completes
(echo "1"; echo "2"; echo "+"; echo "+"; sleep 11; echo "p"; echo "c"; echo "q") | node dist/index.js

echo "CLI simulation tests completed. Check result.txt for output."
