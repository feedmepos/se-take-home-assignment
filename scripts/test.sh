#!/bin/bash
set -e

echo "=== Unit Test Script ==="

# Use nvm if available
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

echo "Installing dependencies..."
npm ci

echo "Running unit tests..."
npm test

echo "=== Tests complete ==="
