#!/bin/bash
set -euo pipefail

echo "Building frontend application..."
npm ci
npm run build
echo "Build completed"
