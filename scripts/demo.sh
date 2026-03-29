#!/bin/bash

echo "========================================="
echo "McDonald's Order Management System"
echo "Interactive Demo Mode"
echo "========================================="
echo ""
echo "This will run the interactive CLI."
echo ""
echo "Available commands:"
echo "  n - New Normal Order"
echo "  v - New VIP Order"
echo "  + - Add Bot"
echo "  - - Remove Bot"
echo "  s - Show Status"
echo "  q - Quit"
echo ""
echo "========================================="
echo ""

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 确保 scripts 目录存在
mkdir -p scripts

# 如果二进制文件不存在，先构建
if [ ! -f bin/order-controller ]; then
    echo "Binary not found. Building first..."
    ./scripts/build.sh
    echo ""
fi

echo "Starting interactive CLI..."
echo "Type 'q' to quit"
echo ""

# 直接运行二进制文件，进入交互模式
./bin/order-controller

echo ""
echo "========================================="
echo "Demo session ended"
echo "========================================="
echo ""
echo "Results saved to: scripts/result.txt"
echo ""
echo "To view results:"
echo "  cat scripts/result.txt"
echo ""