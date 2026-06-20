#!/bin/bash

set -euo pipefail

echo "Running unit tests..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm ci
npm test

echo "Unit tests completed"
