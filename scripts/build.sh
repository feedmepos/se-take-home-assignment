#!/bin/bash
set -e

echo "=== Build Script ==="

# Use nvm if available to ensure correct Node.js version
if [ -f ".nvmrc" ]; then
  if command -v nvm &>/dev/null; then
    echo "Loading nvm..."
    export NVM_DIR="${HOME}/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install
    nvm use
  fi
fi

echo "Node version: $(node --version)"
echo "NPM version:  $(npm --version)"

echo "Installing dependencies..."
npm ci

echo "Compiling TypeScript..."
npm run build

echo "=== Build complete — output in ./dist ==="
