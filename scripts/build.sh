#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

cd "$(dirname "$0")/.."

go build -o order-controller ./cmd/main.go

if [ $? -eq 0 ]; then
    echo "Build completed successfully"
else
    echo "Build failed"
    exit 1
fi
