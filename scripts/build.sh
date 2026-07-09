#!/bin/bash
set -e

echo "Building CLI application..."
go build -o app .
echo "Build completed: ./app"
