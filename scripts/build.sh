#!/bin/bash
echo "Building CLI application..."
go build -o order-controller ./cmd/order-controller/main.go
echo "Build completed"
