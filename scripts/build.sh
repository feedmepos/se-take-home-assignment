#!/bin/bash

# Build Script for McDonald's Order Management System
echo "Building CLI application..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the NestJS application
echo "Building NestJS application..."
npm run build

echo "Build completed successfully!"