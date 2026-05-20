#!/bin/bash
set -e

echo "=== Run Script ==="

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

# Default mode: CLI simulation (writes result.txt and exits)
# To start the HTTP API server instead, run: node dist/main.js
echo "Running McDonald's Order Management System CLI simulation..."
node dist/cli.js

echo ""
echo "=== Execution complete. Output written to scripts/result.txt ==="
echo ""
cat scripts/result.txt
