#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run demo --silent > scripts/result.txt
cat scripts/result.txt
