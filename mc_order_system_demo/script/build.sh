#!/bin/bash

# 麦当劳订单管理系统 - 构建脚本
# 编译CLI应用程序

echo "=== Building McDonald's Order Management System ==="
echo ""

# 清理旧的构建文件
if [ -f "mc-order-system" ]; then
    rm mc-order-system
    echo "Removed old build"
fi

# 编译应用程序
echo "Compiling..."
go build -o mc-order-system .

# 检查编译结果
if [ $? -eq 0 ]; then
    echo ""
    echo "=== Build successful! ==="
    echo "Binary: mc-order-system"
    ls -lh mc-order-system
    exit 0
else
    echo ""
    echo "=== Build failed ==="
    exit 1
fi
