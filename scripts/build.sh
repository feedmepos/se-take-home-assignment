#!/bin/bash

echo "Building CLI application..."

cd "$(dirname "$0")/.." || exit 1

# Build the application
go build -o order-controller ./cmd/main.go


## Check if the build was successful
if [ $? -eq 0 ]; then
    echo "Build successful! Binary created: order-controller"
else
    echo "Build failed!"
    exit 1
fi