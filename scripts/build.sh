#!/bin/bash
# Build script: prepare the CLI application.
set -e
cd "$(dirname "$0")/.."

echo "Building CLI application..."

# Ensure Node.js is available before doing anything else.
if ! command -v node > /dev/null 2>&1; then
  echo "ERROR: Node.js is not installed or not on PATH. Please install Node.js >= 18." >&2
  exit 1
fi
echo "Using Node.js $(node --version)"

# No third-party dependencies to install (uses only Node.js built-ins).
# Syntax-check the entry points to catch errors before running.
node --check src/OrderController.js
node --check src/virtualClock.js
node --check src/index.js
node --check bin/cli.js

echo "Build completed"