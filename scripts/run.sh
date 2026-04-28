#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

set -e

echo "Running CLI application..."

echo "McDonald's Order Management System - Simulation Results" > scripts/result.txt
echo "" >> scripts/result.txt

cat <<'EOF' | ./order-controller >> scripts/result.txt
new normal
new vip
new normal
add bot
sleep 1
add bot
sleep 11
new vip
sleep 11
remove bot
sleep 1
summary
exit
EOF

echo "CLI application execution completed"