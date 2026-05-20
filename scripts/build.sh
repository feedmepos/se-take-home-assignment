#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

set -e

echo "Building CLI application..."

go build -o order-controller ./cmd/order-controller

echo "Build completed"