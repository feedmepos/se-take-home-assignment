#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Running CLI application..."
# No stdout redirect needed — app writes to both terminal and scripts/result.txt via io.MultiWriter
./order-controller
echo "CLI application execution completed"
