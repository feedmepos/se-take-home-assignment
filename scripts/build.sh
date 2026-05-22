#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

set -e  # Exit on error

echo "Building CLI application..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Compile TypeScript to JavaScript
echo "Compiling TypeScript..."
npm run build

echo "Build completed successfully!"