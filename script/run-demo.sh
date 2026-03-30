#!/usr/bin/env bash
set -euo pipefail

export ORDER_DURATION_MS="${ORDER_DURATION_MS:-200}"
export RESULT_FILE="${RESULT_FILE:-result.txt}"

node src/demo.js
