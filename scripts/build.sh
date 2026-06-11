#!/bin/bash
set -e
echo "Building CLI application..."
go build -o order-controller ./cmd/foundation-cli
echo "Build completed"