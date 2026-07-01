#!/bin/bash
# Build Script - installs dependencies for the Node.js CLI.
# JavaScript is interpreted, so there is no separate compile step; this simply
# prepares the runtime (there are no third-party runtime dependencies).
set -e

echo "Building CLI application..."
npm install
echo "Build completed"
