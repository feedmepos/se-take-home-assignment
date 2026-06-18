#!/bin/bash

set -euo pipefail

echo "Running CLI application..."
npm --silent start > scripts/result.txt
echo "CLI application execution completed"
