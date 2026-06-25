#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

set -e

cd "$(dirname "$0")/.."

echo "Building CLI application..."

# For Go projects:
go build -o bin/mcdonald ./cmd/cli

echo "Build completed"