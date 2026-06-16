#!/bin/bash
set -e
cd "$(dirname "$0")/.."

./scripts/build.sh

# 演示场景: 覆盖所有 PRD 需求
# n=普通订单 v=VIP订单 +=加Bot -=减Bot s=状态 w=等待5s q=退出
./obot <<'EOF' > scripts/result.txt
n
n
v
s
+
s
v
+
s
-
s
w
w
w
s
q
EOF
