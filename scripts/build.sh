#!/bin/bash

# 遇到错误立即退出
set -e

# Build Script
# This script contains compilation/verification steps for the CLI application

echo "Building CLI application..."


cd "$(dirname "$0")/.."


if [ -f "package.json" ]; then
  echo "Installing dependencies..."
  npm install --silent
else
  echo "No package.json found. Skipping dependencies installation."
fi


echo "Compiling and verifying JavaScript syntax..."

for file in *.js; do
  if [ -f "$file" ]; then
    # node -c 
    node -c "$file"
  fi
done

echo "Attempting to require modules to ensure linkages are correct..."

node -e "require('./queue'); require('./botManager'); require('./orderController');"

echo "=================================="
echo "Build completed successfully."
echo "=================================="

exit 0