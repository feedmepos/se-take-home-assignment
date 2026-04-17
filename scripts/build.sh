#!/bin/bash

set -euo pipefail

echo "Building CLI application..."
export GOCACHE="${GOCACHE:-/tmp/se-order-gocache}"
go build -o ./scripts/orderctl ./src/cmd/orderctl
echo "Build completed"
