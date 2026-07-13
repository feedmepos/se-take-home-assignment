#!/bin/bash

# 麦当劳订单管理系统 - 测试脚本
# 运行所有单元测试

echo "=== Running Unit Tests ==="
echo ""

# 运行所有测试
go test -v ./...

# 检查测试退出码
if [ $? -eq 0 ]; then
    echo ""
    echo "=== All tests passed! ==="
    exit 0
else
    echo ""
    echo "=== Some tests failed ==="
    exit 1
fi
