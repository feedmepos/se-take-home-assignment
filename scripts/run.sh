#!/usr/bin/env bash
# run.sh — Execute the CLI and write output to result.txt
set -e

OUTPUT_FILE="scripts/result.txt"

echo "Starting FeedMe Order Controller..."
echo "Process time: ${ORDER_PROCESS_MS:-10000}ms per order"
echo "Output file : $OUTPUT_FILE"
echo ""

OUTPUT_FILE="$OUTPUT_FILE" node src/index.js

echo ""
echo "Done. Results written to $OUTPUT_FILE"
