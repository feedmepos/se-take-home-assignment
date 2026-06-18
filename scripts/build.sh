#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BINARY="${REPO_ROOT}/order-controller"

cd "${REPO_ROOT}"

echo "Building CLI application..."
go build -o "${BINARY}" ./cmd/order-controller
echo "Build completed: ${BINARY}"
