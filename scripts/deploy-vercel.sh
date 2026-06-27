#!/usr/bin/env bash
# Deploy frontend to Vercel production (CLI, scheme 1)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> npm run build"
npm run build

echo "==> vercel deploy --prod"
npx vercel@latest deploy --prod --yes

echo "==> Done. Check the Production URL above."
