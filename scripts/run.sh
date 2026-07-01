#!/bin/bash
set -euo pipefail

echo "Generating frontend simulation result..."
node scripts/generate-result.mjs > scripts/result.txt
echo "Simulation result written to scripts/result.txt"
