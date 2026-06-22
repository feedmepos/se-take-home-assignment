#!/bin/bash
set -e
echo "Building CLI application..."
go build -o order ./cmd/order
echo "Build completed"