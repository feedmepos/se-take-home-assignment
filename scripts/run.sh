#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -x bin/order-controller ]; then
  echo "binary missing, building..."
  ./scripts/build.sh
fi

echo "Running CLI application (simulate mode)..."
./bin/order-controller -mode=simulate -proc-time=10s -out=scripts/result.txt

echo "CLI application execution completed -> scripts/result.txt"
