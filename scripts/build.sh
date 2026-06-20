#!/bin/bash

set -euo pipefail

echo "Building CLI application..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm ci
npm run build

echo "Build completed"
