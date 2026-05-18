#!/bin/bash
set -euo pipefail

echo "Building CLI application..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/../backend"

go build -o order-controller ./cmd

echo "Build completed: backend/order-controller"
