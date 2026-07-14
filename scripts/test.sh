#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "Running unit tests..."
go test -v -count=1 .
echo "Unit tests completed"

echo ""
echo "Running race detection tests..."
go test -v -count=1 -race .
echo "Race detection tests completed"
