#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Running CLI application..."
if [ ! -x bin/feedme ]; then
  scripts/build.sh
fi

bin/feedme > scripts/result.txt

echo "CLI application execution completed"
