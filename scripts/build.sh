#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing dependencies ==="
npm ci

echo "=== Build complete (Node.js — no compilation needed) ==="
node --check src/OrderController.js
node --check src/cli.js
echo "Syntax check passed."
