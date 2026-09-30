#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node src/cli.js --demo > scripts/result.txt
cat scripts/result.txt
