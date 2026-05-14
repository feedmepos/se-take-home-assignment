#!/bin/bash

# Build Script
# This script contains all compilation steps for the CLI application

echo "Building CLI application..."

# Install dependencies
npm install

# Compile TypeScript
npx tsc

echo "Build completed"