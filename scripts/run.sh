#!/usr/bin/env bash
set -euo pipefail

echo "=== Running order controller simulation ==="

# Pipe commands to simulate interactive input for CI:
# 3 = +Bot, 1 = Normal Order, 2 = VIP Order, 4 = -Bot, 5 = Exit
printf "3\n1\n1\n1\n2\n3\n4\n2\n3\n5\n" | node src/cli.js

echo "=== scripts/result.txt ==="
cat scripts/result.txt