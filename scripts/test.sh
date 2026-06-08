#!/bin/bash
# Unit Test Script — 安装依赖,构建 core(cli/server 测试依赖其产物),运行全部单测
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Enabling pnpm via corepack..."
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@10.10.0 --activate >/dev/null 2>&1 || true

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building core package (required by cli/server tests)..."
pnpm --filter @feedme/core build

echo "Running unit tests..."
pnpm -r test

echo "Unit tests completed"
