#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Building CLI application..."
mkdir -p bin
go build -o bin/order-controller .
echo "Build completed -> bin/order-controller"
