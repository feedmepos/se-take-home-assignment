#!/bin/bash
set -e

# 运行 CLI 应用并输出到 result.txt
echo "Running CLI application..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# 确保已编译
if [ ! -f bin/order-controller ]; then
    echo "Binary not found, building first..."
    cd src && go build -o ../bin/order-controller . && cd ..
fi

# 运行模拟模式
./bin/order-controller simulate > scripts/result.txt 2>&1
echo "CLI application execution completed"
echo ""
echo "Result:"
cat scripts/result.txt
