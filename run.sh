#!/usr/bin/env bash
# 构建并运行订单控制器（交互式，从标准输入读命令）。
# 用法:
#   ./run.sh                 交互模式
#   ./run.sh --cook 2s       自定义单张订单烹饪耗时（默认 10s）
#   echo -e "n\nv\n+bot" | ./run.sh --cook 1s    管道喂脚本
set -euo pipefail
cd "$(dirname "$0")"
./build.sh >/dev/null
exec ./bin/orderbot "$@"
