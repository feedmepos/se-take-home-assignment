#!/bin/bash

# Build Script
# This script contains all compilation steps for the CLI application

set -e

echo "Building CLI application..."

cd "$(dirname "$0")/.."

# Build the Go application
go build -o order-controller ./cmd/main.go

echo "Build completed successfully"
