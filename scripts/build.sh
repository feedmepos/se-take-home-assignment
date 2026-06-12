#!/bin/bash

# CI Build Script - Compiles for Linux (GitHub Actions ubuntu-latest)

set -e

echo "Building CLI application..."
mkdir -p scripts
go build -o scripts/order-controller ./cmd/main.go
echo "Build completed: scripts/order-controller"
