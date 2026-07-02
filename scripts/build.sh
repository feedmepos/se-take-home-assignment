#!/bin/bash

# Build Script
echo "Building CLI application..."

if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed."
    exit 1
fi

echo "Node.js $(node --version) detected"
echo "Build completed"
