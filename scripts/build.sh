#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

# Change to project root directory
cd "$(dirname "$0")/.."

# Install dependencies
npm install

echo "Build completed"