#!/usr/bin/env bash
# 本地启动 FeedMe HTTP 服务（先构建 web，再编译并运行 cmd/server）。
# 用法：在项目根目录执行 ./scripts/start-local.sh
# 可选：SKIP_WEB_BUILD=1 ./scripts/start-local.sh 跳过 npm run build（已构建过时）。

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "停止已有 feedme-server（:8080）…"
pkill -f 'feedme-server -addr :8080' || true

if [[ "${SKIP_WEB_BUILD:-}" != "1" ]]; then
  echo "构建前端 (web)…"
  cd web
  npm run build
  cd "$ROOT"
else
  echo "已跳过前端构建 (SKIP_WEB_BUILD=1)"
fi

echo "编译 Go 服务…"
go build -o feedme-server ./cmd/server

echo "启动 http://127.0.0.1:8080 （Ctrl+C 退出）"
exec ./feedme-server -addr :8080
