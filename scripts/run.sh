#!/bin/bash

# Run Script
# Executes the scripted demo, which writes its log to scripts/result.txt.
# Orders cook for a real 10 seconds, so this takes roughly 40 seconds.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "Running CLI application..."
npm run demo
echo "CLI application execution completed"
