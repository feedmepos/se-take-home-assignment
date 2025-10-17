#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building application..."

# For Go projects:
# go build -o order-controller ./cmd/main.go

# For Node.js projects:
cd mock_backend
npm install
# npm run build (if needed)

echo "Build completed"
