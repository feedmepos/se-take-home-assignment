#!/usr/bin/env bash
set -euo pipefail

echo "==> Running unit tests..."
cd "$(dirname "$0")/../backend"
npm run test:ci
echo "==> All tests passed!"
