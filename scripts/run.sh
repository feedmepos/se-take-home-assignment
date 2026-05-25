#!/bin/bash
# ABOUTME: Runs the deterministic order controller demo.
# ABOUTME: Writes timestamped simulation output for the backend verification workflow.

set -euo pipefail

echo "Running CLI application..."

./bin/order-controller demo > scripts/result.txt

echo "CLI application execution completed"
