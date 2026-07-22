#!/bin/bash
set -euo pipefail

echo "Running unit tests..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/../backend"

go test ./... -v

echo "Unit tests completed"
