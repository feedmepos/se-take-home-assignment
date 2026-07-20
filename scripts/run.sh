#!/bin/bash
set -e

# Run from repo root (CI invokes ./scripts/run.sh from root).
cd "$(dirname "$0")/.."

# Ensure the CLI binary exists (in case run.sh is invoked without build.sh).
if [ ! -x bin/order-cli ]; then
  echo "bin/order-cli not found, building..."
  go build -o bin/order-cli ./cmd/cli
fi

echo "Running scenario, writing scripts/result.txt..."
./bin/order-cli --scenario | tee scripts/result.txt
echo "Run completed"
