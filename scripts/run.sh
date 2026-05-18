#!/bin/bash
echo "Running CLI application..."
node dist/index.js <<EOF
q
EOF
echo "CLI execution completed"