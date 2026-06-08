#!/bin/bash
# Build Script — 编译所有 workspace 包(core / cli / server / web 视存在情况)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Enabling pnpm via corepack..."
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@10.10.0 --activate >/dev/null 2>&1 || true

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building all packages..."
pnpm -r build

echo "Build completed"
