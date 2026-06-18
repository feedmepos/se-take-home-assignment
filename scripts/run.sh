#!/bin/bash

set -euo pipefail

echo "Running CLI application..."
npm start > scripts/result.txt
echo "CLI application execution completed"
