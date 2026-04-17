#!/bin/bash

set -euo pipefail

echo "Running CLI application..."
./scripts/orderctl -input-file ./scripts/input.txt -output-file ./scripts/result.txt
echo "CLI application execution completed"
