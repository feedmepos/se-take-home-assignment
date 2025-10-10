#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$ROOT_DIR"

mkdir -p scripts

# Build binary if not exists
if [ ! -x bin/order-controller ]; then
	echo "Binary not found, building..."
	./scripts/build.sh
fi

# Default processing time and output path
PROCESSING_MS="${PROCESSING_MS:-1000}"

# Decide scenario
SCENARIO_FILE="${SCENARIO_FILE:-}"
if [ -z "$SCENARIO_FILE" ]; then
	SCENARIO_FILE="scripts/scenarios/00_all_in_one.txt"
fi

# Compute a final wait to allow in-flight orders to complete, then append a final status.
FINAL_WAIT_MS_CALC=$(( PROCESSING_MS * ${FINAL_WAIT_FACTOR:-5} ))
FINAL_WAIT_MS="${FINAL_WAIT_MS:-$FINAL_WAIT_MS_CALC}"

# Build a temporary script that appends a final wait + status, so everything runs in one scheduler session.
TMP_SCRIPT="$(mktemp -t scenario-XXXXXX.txt)"
cleanup() { rm -f "$TMP_SCRIPT" || true; }
trap cleanup EXIT
cat "$SCENARIO_FILE" > "$TMP_SCRIPT"
{
	echo ""
	echo "# finalization: ensure we show the final processing result"
	echo "wait $FINAL_WAIT_MS"
	echo "status"
} >> "$TMP_SCRIPT"

# Execute CLI in scripted mode using the augmented script
./bin/order-controller --processing-ms "$PROCESSING_MS" --out scripts/result.txt --script "$TMP_SCRIPT"

# For Node.js projects:
# node index.js > result.txt
# or npm start > result.txt

echo "CLI application execution completed; output written to scripts/result.txt"