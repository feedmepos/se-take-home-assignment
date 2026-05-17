#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "Building CLI application..."
go build -o order-controller ./cmd/orderctl
echo "Building HTTP server..."
go build -o feedme-server ./cmd/server
echo "Build completed"
