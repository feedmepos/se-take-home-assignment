#!/bin/bash
# build.sh

set -e

echo "Building McDonald's Order Management System..."

# Initialize Go module if not exists
if [ ! -f go.mod ]; then
    go mod init order-controller
fi

# Tidy dependencies
go mod tidy

# Build the application
go build -o order-controller

echo "Build completed successfully"