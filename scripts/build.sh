#!/bin/bash
set -e

# Build Script
# This script contains all compilation steps for the CLI application

echo "Building CLI application..."
go build -o order-controller ./cmd/main.go
echo "Build completed"