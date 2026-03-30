#!/bin/bash
set -e

# 编译构建脚本
echo "Building CLI application..."
cd src && go build -o ../bin/order-controller .
echo "Build completed"
