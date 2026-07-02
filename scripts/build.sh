#!/usr/bin/env bash

set -euo pipefail

echo "Building CLI application..."

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"
mkdir -p "${ROOT_DIR}/bin"
export GOCACHE="${GOCACHE:-/tmp/se-take-home-go-cache}"

go build -o "${ROOT_DIR}/bin/order-controller" ./cmd/order-controller

echo "Build completed"
