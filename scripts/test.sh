#!/bin/bash
set -euo pipefail

echo "Running unit tests..."
cd "$(dirname "$0")/.."
go test ./internal/controller/ -v -timeout 120s
echo "Unit tests completed"
