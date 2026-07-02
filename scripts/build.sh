#!/bin/bash
set -euo pipefail

# Build Script
# Builds the frontend prototype into the dist directory.

echo "Building frontend application..."

if [ ! -d "node_modules" ]; then
  npm ci
fi

npm run build

echo "Build completed"
