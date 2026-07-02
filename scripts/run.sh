#!/usr/bin/env bash

set -euo pipefail

echo "Running CLI application..."

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

if [ ! -x "${ROOT_DIR}/bin/order-controller" ]; then
  "${SCRIPT_DIR}/build.sh"
fi

"${ROOT_DIR}/bin/order-controller" run > "${SCRIPT_DIR}/result.txt"

echo "CLI application execution completed"
