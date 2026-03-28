#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed or not in PATH"
    exit 1
fi

# For Go projects:
# Detect OS and set executable name
OS=$(uname -s 2>/dev/null || echo "Windows")
if [ "$OS" = "Linux" ] || [ "$OS" = "Darwin" ]; then
    EXECUTABLE="../order-controller"
else
    EXECUTABLE="../order-controller.exe"
fi

go build -o "$EXECUTABLE" ../cmd/main.go

if [ $? -eq 0 ]; then
    echo "Build completed successfully"
    echo "Executable: $EXECUTABLE"
else
    echo "Build failed"
    exit 1
fi


