#!/bin/bash
set -euo pipefail

echo "Running CLI application..."

if [ ! -x bin/order-controller ]; then
  ./scripts/build.sh
fi

./bin/order-controller | tee scripts/result.txt

echo "CLI application execution completed"
