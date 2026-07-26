#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v go >/dev/null 2>&1; then
	echo "test.sh: go is not installed or not in PATH" >&2
	exit 1
fi

go version

go mod tidy

go test ./internal/...
