#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building application..."

go build -o order-system ../main.go
echo "Build successful: order-system"

echo "Build completed"