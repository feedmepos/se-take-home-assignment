#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

# For Go projects:
go build -o order-controller ./cmd/order-controller/main.go

# For Node.js projects:
# npm install
# npm run build (if needed)

echo "Build completed"