#!/bin/bash
echo "Running unit tests..."

set -euo pipefail
cd "$(dirname "$0")/.."
go test ./... -race -v -count=1

echo "Unit tests completed"
