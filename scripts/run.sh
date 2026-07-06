#!/bin/bash

echo "Running CLI application..."

set -euo pipefail
cd "$(dirname "$0")/.."
PROCESS_DURATION="${ORDER_PROCESS_DURATION:-10s}"
./bin/order-controller \
  --batch scripts/scenarios/ci.txt \
  --process-duration="${PROCESS_DURATION}" \
  > scripts/result.txt

echo "CLI application execution completed"