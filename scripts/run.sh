#!/bin/bash
set -e

echo "Running CLI application..."

PROC_TIME_MS=1000 ./order-controller > scripts/result.txt << 'EOF'
order normal
order vip
order normal
order normal
bot add
bot add
bot add
sleep 500ms
bot remove
exit
EOF

echo "Output written to scripts/result.txt"
