#!/bin/bash
# Source from other scripts: ensure `go` is on PATH for local runs.
# GitHub Actions already has Go; locally we fall back to repo-bundled .tools/go.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v go >/dev/null 2>&1; then
  if [ -x "$ROOT_DIR/.tools/go/bin/go" ]; then
    export PATH="$ROOT_DIR/.tools/go/bin:$PATH"
  fi
fi

if ! command -v go >/dev/null 2>&1; then
  echo "ERROR: go not found on PATH."
  echo "Install Go 1.23+ (https://go.dev/dl/) or place a toolchain at .tools/go/bin/go"
  exit 1
fi
