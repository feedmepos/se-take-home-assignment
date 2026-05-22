#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."
RESULT_FILE="${SCRIPT_DIR}/result.txt"

echo "Running CLI application..."

cd "${PROJECT_ROOT}"
npm ci >/dev/null
npm run build >/dev/null
node dist/src/cli.js | tee "${RESULT_FILE}"

echo "CLI application execution completed"
