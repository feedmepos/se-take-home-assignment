#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

go build -o order-controller ./cmd/main.go

echo "Build completed"