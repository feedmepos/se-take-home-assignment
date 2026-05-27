#!/bin/bash
set -e
node backend/dist/cli/scenario.js > scripts/result.txt
echo "Wrote scripts/result.txt"
