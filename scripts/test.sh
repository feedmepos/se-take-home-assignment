#!/bin/bash

set -euo pipefail

echo "Running unit tests..."
export GOCACHE="${GOCACHE:-/tmp/se-order-gocache}"
go test ./... -v
echo "Unit tests completed"
