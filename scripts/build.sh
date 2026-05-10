#!/bin/bash
set -euo pipefail

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

GOCACHE="$(pwd)/.cache/go-build" go build -o order-controller ./cmd/order-controller

echo "Build completed"
