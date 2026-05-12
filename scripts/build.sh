#!/bin/bash

# Build Script
# This script compiles the TypeScript CLI application

echo "Building CLI application..."

# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run build

echo "Build completed"
