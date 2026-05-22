#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

echo "Running unit tests..."

cd "${PROJECT_ROOT}"
npm ci
npm test

echo "Unit tests completed"
