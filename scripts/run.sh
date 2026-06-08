#!/bin/bash
# Run Script — 执行 CLI 演示场景,输出带时间戳的结果到 scripts/result.txt
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Enabling pnpm via corepack..."
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@10.10.0 --activate >/dev/null 2>&1 || true

# 若尚未构建(单独运行 run.sh 时),先安装并构建
if [ ! -f apps/cli/dist/main.js ]; then
  echo "CLI not built yet, installing and building..."
  pnpm install --frozen-lockfile
  pnpm -r build
fi

echo "Running CLI application..."
node apps/cli/dist/main.js > scripts/result.txt

echo "CLI application execution completed"
echo "----- scripts/result.txt -----"
cat scripts/result.txt
