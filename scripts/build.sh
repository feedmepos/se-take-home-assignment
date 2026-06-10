#!/bin/bash

# Build Script
# Compiles both cmd/demo and cmd/interactive CLI targets.

set -e

echo "Building CLI application..."

go build -o demo ./cmd/demo/
go build -o interactive ./cmd/interactive/

echo "Build completed"
