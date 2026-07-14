#!/bin/bash

# Build Script
# Compiles the CLI application

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Building CLI application..."

go build -o bin/feedme ./cmd/api

echo "Build completed"
