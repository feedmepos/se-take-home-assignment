#!/bin/bash
# Build script for McDonald CLI

set -e

echo "Building McDonald CLI..."

cd "$(dirname "$0")/.."

# Build the CLI
go build -o bin/mcdonald ./cmd/cli

echo "Build successful!"
echo "Binary: bin/mcdonald"
