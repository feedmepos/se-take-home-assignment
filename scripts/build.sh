#!/bin/bash

set -euo pipefail

echo "Building CLI application..."
go build -o order-controller ./cmd/order-controller

echo "Build completed"