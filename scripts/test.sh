#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "Running unit tests..."
go test ./... -count=1 -race
echo "Unit tests completed"
