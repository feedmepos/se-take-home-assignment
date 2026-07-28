#!/bin/bash

set -euo pipefail

echo "Running CLI application..."
./order-controller --demo > scripts/result.txt

echo "CLI application execution completed"