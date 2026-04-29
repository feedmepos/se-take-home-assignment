#!/bin/bash
set -euo pipefail

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

go build -o order-controller .

echo "Build completed"
