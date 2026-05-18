#!/bin/bash
set -euo pipefail

echo "Running CLI application..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/../backend"

if [ ! -x ./order-controller ]; then
  echo "Binary not found, building first..."
  go build -o order-controller ./cmd
fi

./order-controller -demo > "${SCRIPT_DIR}/result.txt"

echo "CLI application execution completed"
echo "Result written to scripts/result.txt"
