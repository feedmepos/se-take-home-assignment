#!/bin/bash
set -e

echo "Building CLI application..."
node --check scripts/order-controller.js
echo "Build completed"
