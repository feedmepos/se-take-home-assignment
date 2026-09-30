#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node src/demo.js > scripts/result.txt
cat scripts/result.txt
