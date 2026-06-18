#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BINARY="${REPO_ROOT}/order-controller"
RESULT_FILE="${SCRIPT_DIR}/result.txt"
MODE="${1:-demo}"

cd "${REPO_ROOT}"

echo "Building CLI application..."
go build -o "${BINARY}" ./cmd/order-controller

case "${MODE}" in
  tui)
    echo "Starting interactive TUI..."
    exec "${BINARY}" tui
    ;;
  demo)
    echo "Running deterministic demo..."
    "${BINARY}" demo > "${RESULT_FILE}"
    echo "Demo output written to ${RESULT_FILE}"
    ;;
  *)
    echo "Unknown mode: ${MODE}" >&2
    echo "Usage: ./scripts/run.sh [tui|demo]" >&2
    exit 1
    ;;
esac
