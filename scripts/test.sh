#!/usr/bin/env bash

set -euo pipefail

echo "Running unit tests..."

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"
export GOCACHE="${GOCACHE:-/tmp/se-take-home-go-cache}"

go test ./...

echo "Unit tests completed"
