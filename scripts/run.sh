#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" == "--interactive" ]]; then
  node src/cli.js | tee scripts/result.txt
else
  node src/cli.js --demo > scripts/result.txt
  cat scripts/result.txt
fi
