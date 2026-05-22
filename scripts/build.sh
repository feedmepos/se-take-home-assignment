#!/bin/bash
# Build Script for Node.js CLI
set -e

echo "Building CLI application..."

if [ -f package.json ]; then
  npm install
fi

echo "Build completed (Node.js CLI, no compilation needed)."
