#!/bin/bash

set -euo pipefail

echo "Running CLI application..."

if [ ! -d node_modules/typescript ]; then
  npm ci
fi

npm run build
node dist/cli.js > scripts/result.txt

echo "CLI application execution completed"
