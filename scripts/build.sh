#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

# For Go projects:
# go build -o order-controller ./cmd/main.go

# For Node.js projects:
# npm install
# npm run build (if needed)

cd "$(dirname "$0")/.."

go build -o order-controller .

echo "Build completed"