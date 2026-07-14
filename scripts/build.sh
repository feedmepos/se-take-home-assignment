#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "Building CLI application..."
go build -o order-controller .
echo "Build completed"
