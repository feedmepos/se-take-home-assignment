#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing dependencies ==="
npm ci

echo "=== Running unit tests ==="
npm test
