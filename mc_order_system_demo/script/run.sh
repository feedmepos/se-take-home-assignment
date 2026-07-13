#!/bin/bash

# 麦当劳订单管理系统 - 运行脚本
# 执行CLI应用程序并输出结果到result.txt

echo "=== Running McDonald's Order Management System ==="
echo ""

# 检查是否已编译
if [ ! -f "mc-order-system" ]; then
    echo "Binary not found. Running build.sh first..."
    bash script/build.sh
    if [ $? -ne 0 ]; then
        echo "Build failed!"
        exit 1
    fi
fi

# 运行演示场景
echo "Running demo scenario..."
echo ""

# 创建演示脚本
cat > demo_script.txt << 'EOF'
new normal
new normal
new vip
+bot
+bot
status
result
quit
EOF

# 运行程序并输入命令
./mc-order-system < demo_script.txt

# 清理临时文件
rm demo_script.txt

echo ""
echo "=== Demo completed ==="
echo "Results saved to result.txt"
echo ""

# 显示result.txt内容
if [ -f "result.txt" ]; then
    echo "=== Result.txt Contents ==="
    cat result.txt
else
    echo "Warning: result.txt not found"
fi
