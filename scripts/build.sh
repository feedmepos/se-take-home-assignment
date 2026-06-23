#!/bin/bash

set -euo pipefail

echo "Building CLI application..."

if [ ! -d node_modules/typescript ]; then
  npm ci
fi

npm run build

echo "Build completed"
