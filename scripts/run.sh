#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# 运行模拟模式（非交互），输出重定向到 scripts/result.txt
# CI 环境无交互终端，必须使用 simulate 模式
./order-controller simulate > scripts/result.txt

echo "CLI application execution completed"
