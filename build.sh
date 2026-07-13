#!/usr/bin/env bash
# 编译订单控制器到 ./bin/orderbot
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p bin
go build -o bin/orderbot ./cmd/orderbot
echo "built: bin/orderbot"
