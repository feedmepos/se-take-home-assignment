#!/bin/bash

# Build Script
# This script should contain all compilation steps for your CLI application

echo "Building CLI application..."

npm install
cp .env.dist .env

echo "Build completed"