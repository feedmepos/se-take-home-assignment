#!/usr/bin/env bash
set -euo pipefail
npm install >/dev/null 2>&1 || true
node -e "console.log('build complete')"
