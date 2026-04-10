#!/bin/bash

set -euo pipefail

echo "Running CLI application..."
./order-controller << 'EOF' > scripts/result.txt
demo
exit
EOF

echo "CLI application execution completed"