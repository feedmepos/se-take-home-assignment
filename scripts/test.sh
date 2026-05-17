#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Running frontend unit tests (Vitest)..."
npm ci
npm run test -w web
echo "Tests completed"
