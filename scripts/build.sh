#!/bin/bash

# Build Script
# Builds the McDonald's Order Management System CLI application

echo "Building McDonald's Order Management System..."
echo ""

# Build the application
go build main.go

if [ $? -eq 0 ]; then
  echo "Build successful! Binary created at root "
  echo "To run the application, execute: main"
else
  echo "Build failed!"
  exit 1
fi
