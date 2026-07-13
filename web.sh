#!/usr/bin/env bash
# 构建并启动 Web 版订单控制台。
# 用法:
#   ./web.sh                     默认 http://localhost:8080，烹饪 10s
#   ./web.sh --addr :9000 --cook 2s
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p bin
go build -o bin/orderbotweb ./cmd/orderbotweb
exec ./bin/orderbotweb "$@"
