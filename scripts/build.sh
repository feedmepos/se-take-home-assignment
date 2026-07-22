#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

mkdir -p bin
go build -o bin/order-server ./cmd/server
go build -o bin/order-cli ./cmd/cli

echo "Build completed"