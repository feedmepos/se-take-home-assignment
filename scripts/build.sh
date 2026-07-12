#!/bin/bash

# Build Script
# Compiles the Go CLI application.

set -e

echo "Building CLI application..."

go build -o order-controller ./cmd/order-controller

echo "Build completed"
