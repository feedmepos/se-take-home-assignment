#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Building Next.js production bundle (static export)..."
npm ci
npm run build -w web
echo "Build completed (Next.js static export: web/out)"
