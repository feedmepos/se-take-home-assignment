#!/bin/bash
set -e

echo "========================================="
echo "Building McDonald's Order Management System"
echo "========================================="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 创建 bin 目录
mkdir -p bin

# 初始化 Go 模块（如果不存在）
if [ ! -f go.mod ]; then
    echo "Initializing Go module..."
    go mod init order-controller
fi

# 整理依赖
echo "Tidying dependencies..."
go mod tidy

# 编译应用
echo "Compiling application..."
go build -o bin/order-controller ./cmd/main.go

# 检查编译结果
if [ -f bin/order-controller ]; then
    echo ""
    echo "========================================="
    echo "✅ Build completed successfully!"
    echo "Binary location: $(pwd)/bin/order-controller"
    echo "Binary size: $(ls -lh bin/order-controller | awk '{print $5}')"
    echo "========================================="
else
    echo ""
    echo "========================================="
    echo "❌ Build failed!"
    echo "========================================="
    exit 1
fi