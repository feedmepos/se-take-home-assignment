#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

cd "$(dirname "$0")/.."
npm install
npm run build

echo "Build completed"