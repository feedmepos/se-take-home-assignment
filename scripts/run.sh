#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f bin/order_bot ]; then
	echo "run.sh: bin/order_bot not found, run scripts/build.sh first" >&2
	exit 1
fi

./bin/order_bot
