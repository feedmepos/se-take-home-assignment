#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -x bin/order-controller ]; then
  "$ROOT_DIR/scripts/build.sh"
fi

bin/order-controller -demo > scripts/result.txt
