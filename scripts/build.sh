#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export GOCACHE="${GOCACHE:-$PWD/.cache/go-build}"
mkdir -p "$GOCACHE"

echo "Building CLI application..."
mkdir -p bin
go build -o bin/feedme ./cmd/feedme
echo "Build completed"
