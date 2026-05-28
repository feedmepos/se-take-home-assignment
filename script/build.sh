#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing backend dependencies..."
cd "$(dirname "$0")/../backend"
npm install

echo "==> Build complete (Node.js – no compilation step required)"
