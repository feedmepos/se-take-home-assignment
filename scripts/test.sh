#!/bin/bash

# Test script for McDonald's Order Management System
echo "Running tests..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run unit tests
echo "Running unit tests..."
npm test

echo "Tests completed!"
