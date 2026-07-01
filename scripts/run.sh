#!/bin/bash
# Run Script - runs the demonstration scenario and captures output to result.txt.
# Uses real 10s-per-order timers, so completion timestamps are genuine.
set -e

echo "Running CLI application..."

node scenario.js | tee scripts/result.txt

echo "CLI application execution completed"
