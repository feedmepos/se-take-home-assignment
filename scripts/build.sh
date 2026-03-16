#!/bin/bash
echo "Building CLI application..."

cd backend
go build -o order-controller ./cmd/cli

echo "Build completed"
