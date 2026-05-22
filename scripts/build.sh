#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

echo "Building CLI application..."

cd "${PROJECT_ROOT}"
npm ci
npm run build >/dev/null

echo "Build completed"
