#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Running unit tests..."
# 限定包路径，避免扫描 frontend/node_modules 内嵌的第三方 Go 示例包
go test ./internal/... ./cmd/... -count=1
echo "Unit tests completed"
