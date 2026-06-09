#!/bin/bash
set -e

NODE_BIN="$(command -v node || command -v node.exe || true)"
if [ -z "$NODE_BIN" ]; then
  echo "ERROR: node is required but was not found on PATH" >&2
  exit 1
fi

"$NODE_BIN" backend/dist/cli/scenario.js > scripts/result.txt
echo "Wrote scripts/result.txt"
