#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

set -e  # Exit on error

echo "Building application..."

cd feedme-backend

# Install dependencies
if command -v yarn &> /dev/null; then
    yarn install --frozen-lockfile
else
    echo "Yarn not found, using npm instead..."
    npm ci
fi

# Compile TypeScript
if command -v yarn &> /dev/null; then
    yarn build
else
    npm run build
fi

# Verify build output
if [ ! -f "dist/cli.js" ]; then
    echo "Error: CLI build failed - dist/cli.js not found"
    exit 1
fi

echo "Build completed successfully"