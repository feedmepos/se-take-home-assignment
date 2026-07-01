#!/bin/bash
set -euo pipefail
export GOPATH="${GOPATH:-$PWD/.cache/go}"
export GOCACHE="${GOCACHE:-$PWD/.cache/go-build}"

echo "Running unit tests..."

go test ./... -v

echo "Unit tests completed"
