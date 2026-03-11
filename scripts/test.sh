#!/usr/bin/env bash
# test.sh — Run unit tests
set -e

echo "Running OrderController unit tests..."
ORDER_PROCESS_MS=100 node src/tests.js
