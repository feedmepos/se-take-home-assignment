#!/bin/bash
# ABOUTME: Builds the order controller CLI binary.
# ABOUTME: Provides the build entrypoint used by the backend verification workflow.

set -euo pipefail

echo "Building CLI application..."

mkdir -p bin
go build -o bin/order-controller ./cmd/order-controller

echo "Build completed"
