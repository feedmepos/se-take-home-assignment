#!/usr/bin/env bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

# For Go projects:
# go build -o order-controller ./cmd/main.go

# For Node.js projects:
set -euo pipefail
npm ci
npm run build

echo "Build completed"