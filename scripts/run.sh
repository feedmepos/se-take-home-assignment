#!/bin/bash
set -euo pipefail
export GOPATH="${GOPATH:-$PWD/.cache/go}"
export GOCACHE="${GOCACHE:-$PWD/.cache/go-build}"

echo "Running CLI application..."

if [ ! -x ./order-controller ]; then
  go build -o order-controller ./cmd/order-controller
fi

./order-controller > scripts/result.txt

echo "CLI application execution completed"
