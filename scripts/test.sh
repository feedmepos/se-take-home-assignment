#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export GOCACHE="${GOCACHE:-$PWD/.cache/go-build}"
mkdir -p "$GOCACHE"

echo "Running unit tests..."
go test ./... -v
echo "Unit tests completed"
