#!/bin/bash
set -e # Exit on error

echo "=== Building McDonald's Order CLI Application ==="
# Initialize npm (if not initialized)
if [ ! -f package.json ]; then
  npm init -y
fi

# Check Node.js installation
node -v || (echo "Error: Node.js is not installed" && exit 1)

echo "Build completed ✅"