#!/bin/bash
set -euo pipefail
export GOPATH="${GOPATH:-$PWD/.cache/go}"
export GOCACHE="${GOCACHE:-$PWD/.cache/go-build}"

echo "Building CLI application..."

go build -o order-controller ./cmd/order-controller

echo "Build completed"
