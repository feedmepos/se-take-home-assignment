#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Running unit tests..."
go test ./... -count=1
echo "Unit tests completed"
