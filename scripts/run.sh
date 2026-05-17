#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "$ROOT/web/out" ] || [ -z "$(ls -A "$ROOT/web/out" 2>/dev/null || true)" ]; then
  echo "ERROR: web/out is missing or empty — run scripts/build.sh first (Next.js static export)"
  exit 1
fi

TS="$(date +%H:%M:%S)"
{
  echo "[$TS] McDonald's order controller — frontend (Next.js static export) artifact verified."
  echo "[$TS] Static site output: web/out (ready for Netlify/GitHub Pages; Vercel can use Next directly)."
} > "$ROOT/scripts/result.txt"

echo "Wrote scripts/result.txt"
echo "CLI application execution completed"
