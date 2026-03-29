#!/bin/bash
set -e

echo "========================================="
echo "Running Unit Tests"
echo "========================================="

# 切换到脚本所在目录的上一级（项目根目录）
cd "$(dirname "$0")/.."

# 显示当前目录（应该是项目根目录）
echo "Working directory: $(pwd)"

# 确保 scripts 目录存在
mkdir -p scripts

# 清理旧的 result.txt（可选）
rm -f scripts/result.txt

# 初始化模块
if [ ! -f go.mod ]; then
    echo "Initializing Go module..."
    go mod init order-controller
fi

# 整理依赖
echo "Tidying dependencies..."
go mod tidy

# 运行测试（现在在项目根目录，result.txt 会创建在 scripts/）
echo "Running tests..."
go test -v ./pkg/controller/...

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ All unit tests passed!"
    echo "========================================="
    
    # 显示 result.txt 的位置和内容
    if [ -f scripts/result.txt ]; then
        echo ""
        echo "📄 Result file: $(pwd)/scripts/result.txt"
        echo "File size: $(wc -c < scripts/result.txt) bytes"
        echo ""
        echo "First 10 lines:"
        echo "----------------------------------------"
        head -10 scripts/result.txt
        echo "----------------------------------------"
    else
        echo ""
        echo "⚠️  Warning: scripts/result.txt was not created"
    fi
else
    echo ""
    echo "========================================="
    echo "❌ Unit tests failed!"
    echo "========================================="
    exit 1
fi