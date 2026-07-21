#!/bin/bash

# Build Script
# The CLI is plain Node.js with zero dependencies, so there is nothing to
# compile. Instead we syntax-check every source file to catch parse errors
# before the run step.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building CLI application..."
for file in src/*.js test/*.js; do
  node --check "$file"
  echo "  checked $file"
done
echo "Build completed (no compilation needed - plain Node.js, zero dependencies)"
