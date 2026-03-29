#!/bin/bash
set -e

echo "========================================="
echo "Running McDonald's Order Management System"
echo "========================================="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 确保 scripts 目录存在
mkdir -p scripts

# 如果二进制文件不存在，先构建
if [ ! -f bin/order-controller ]; then
    echo "Binary not found. Building first..."
    ./scripts/build.sh
fi

echo ""
echo "Starting simulation with test scenario..."
echo ""

# 定义测试场景：模拟用户操作序列
# 场景描述：
# 1. 创建普通订单
# 2. 创建VIP订单
# 3. 创建普通订单
# 4. 添加机器人
# 5. 添加第二个机器人
# 6. 创建VIP订单
# 7. 移除一个机器人
# 8. 退出

{
    echo "n"          # 创建普通订单 #1001
    sleep 1
    echo "v"          # 创建VIP订单 #1002
    sleep 1
    echo "n"          # 创建普通订单 #1003
    sleep 1
    echo "+"          # 添加机器人 #1
    sleep 1
    echo "+"          # 添加机器人 #2
    sleep 1
    echo "v"          # 创建VIP订单 #1004
    sleep 2
    echo "-"          # 移除机器人 #2
    sleep 2
    echo "s"          # 显示状态
    sleep 1
    echo "q"          # 退出程序
} | ./bin/order-controller

echo ""
echo "========================================="
echo "✅ Simulation completed!"
echo "========================================="

# 验证 result.txt 是否生成
if [ -f scripts/result.txt ]; then
    echo ""
    echo "📄 Results saved to: scripts/result.txt"
    echo "File size: $(wc -c < scripts/result.txt) bytes"
    echo "Line count: $(wc -l < scripts/result.txt) lines"
    echo ""
    echo "First 10 lines of output:"
    echo "----------------------------------------"
    head -10 scripts/result.txt
    echo "----------------------------------------"
    echo ""
    echo "Last 5 lines of output:"
    echo "----------------------------------------"
    tail -5 scripts/result.txt
    echo "----------------------------------------"
else
    echo ""
    echo "❌ ERROR: scripts/result.txt was not created!"
    exit 1
fi

echo ""
echo "========================================="
echo "🎉 All done! Check scripts/result.txt for full output"
echo "========================================="