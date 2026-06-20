#!/bin/bash

set -euo pipefail

echo "Running CLI application..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm ci
npm run build
node dist/src/cli.js > scripts/result.txt

echo "CLI application execution completed"
