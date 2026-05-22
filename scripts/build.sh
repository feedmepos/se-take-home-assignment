#!/bin/bash

set -e

echo "Building CLI application..."
go build -o order-controller ./cmd/
echo "Build completed"
