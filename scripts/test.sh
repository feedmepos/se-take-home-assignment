#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./_go_env.sh
source "$SCRIPT_DIR/_go_env.sh"
cd "$SCRIPT_DIR/.."
echo "Running unit tests..."
go test ./... -v
echo "Unit tests completed"
