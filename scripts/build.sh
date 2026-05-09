#!/bin/bash

# Build Script
# This script contains all compilation steps for the CLI application

echo "Building CLI application..."

cd "$(dirname "$0")/.."

go build -o order-controller ./cmd/main.go

echo "Build completed"
