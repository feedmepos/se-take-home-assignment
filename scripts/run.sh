#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Running CLI application..."
export FEEDME_DEMO_FAST=1
export FEEDME_PROCESS_MS="${FEEDME_PROCESS_MS:-50}"
./bin/feedme run-demo > scripts/result.txt
echo "CLI application execution completed"
