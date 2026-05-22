#!/bin/bash
set -e

echo "Building CLI application..."
go build -o order-controller .
echo "Build completed"