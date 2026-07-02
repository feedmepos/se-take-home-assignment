#!/bin/bash

echo "Running CLI application..."

{ sleep 5; kill $$ 2>/dev/null; } &

cat > /tmp/input.txt <<EOF
addOrder
addVipOrder
addRobot
status
quit
EOF

./order-controller < /tmp/input.txt

echo "CLI application execution completed"
