#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./_go_env.sh
source "$SCRIPT_DIR/_go_env.sh"
cd "$SCRIPT_DIR/.."
echo "Building CLI application..."
mkdir -p bin
go build -buildvcs=false -o bin/order-controller ./cmd/order-controller
echo "Build completed"
