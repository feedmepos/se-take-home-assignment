#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Building CLI application..."
mkdir -p bin
go build -o bin/feedme ./cmd/feedme
go build -o bin/server ./cmd/server
echo "Build completed"
