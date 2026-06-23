#!/bin/bash

set -euo pipefail

echo "Running unit tests..."

if [ ! -d node_modules/typescript ]; then
  npm ci
fi

npm test

echo "Unit tests completed"
