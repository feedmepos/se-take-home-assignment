#!/bin/bash
# Build Script -- installs the Node.js CLI application dependencies.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND="$ROOT/codes/backend"

echo "Building CLI application..."
cd "$BACKEND"

# No third-party dependencies are required (built on Node.js stdlib only),
# but we still run npm install so package-lock / engines are validated.
npm install

echo "Build completed"
