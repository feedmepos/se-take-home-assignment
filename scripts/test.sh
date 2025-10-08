#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$ROOT_DIR"

# For Go projects (placeholder - no tests yet)
go test ./... -v || true

echo "Running scenario tests..."

# Ensure binary exists
./scripts/build.sh

SCENARIOS_DIR="scripts/scenarios"
RESULTS_DIR="scripts/results"
mkdir -p "$RESULTS_DIR"
AGG_FILE="$RESULTS_DIR/test-log-$(date +%Y%m%d-%H%M%S).txt"
echo "Aggregate scenario log: $AGG_FILE"
FAILED=0

for scenario in "$SCENARIOS_DIR"/*.txt; do
	echo "--- Running scenario: $scenario ---"
	# Set fast processing to make tests quick
	export PROCESSING_MS=${PROCESSING_MS:-50}
	export SCENARIO_FILE="$scenario"
	# Run
	./scripts/run.sh

	# Basic assertions on result file
	if [ ! -f scripts/result.txt ]; then
		echo "ERROR: scripts/result.txt not found for $scenario"
		FAILED=1
		continue
	fi
	if [ ! -s scripts/result.txt ]; then
		echo "ERROR: scripts/result.txt is empty for $scenario"
		FAILED=1
		continue
	fi
	if ! grep -E '[0-9]{2}:[0-9]{2}:[0-9]{2}' scripts/result.txt > /dev/null; then
		echo "ERROR: missing HH:MM:SS timestamp in $scenario"
		FAILED=1
	fi
	# Spot-check presence of STATUS or ORDER/BOT events to ensure the run executed
	if ! grep -E 'STATUS|ORDER|BOT' scripts/result.txt > /dev/null; then
		echo "ERROR: missing expected keywords in $scenario"
		FAILED=1
	fi

		# Append to aggregate log with header separators (single combined log only)
		SCENARIO_NAME="$(basename "$scenario")"
		{
			echo "==== SCENARIO: $SCENARIO_NAME ($(date +%Y-%m-%d\ %H:%M:%S)) ===="
			cat scripts/result.txt
			echo ""
		} >> "$AGG_FILE"
done

if [ "$FAILED" -ne 0 ]; then
	echo "Scenario tests FAILED"
	exit 1
fi
echo "Scenario tests passed"

# For Node.js projects:
# npm test

echo "Unit tests completed"
