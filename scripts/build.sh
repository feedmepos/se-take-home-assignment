#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

set -e

echo "Building McDonald's Order Management System..."
go build -o order-controller ./cmd/main.go

echo "Build completed successfully!"
echo "Binary created: order-controller"

echo "Build completed"