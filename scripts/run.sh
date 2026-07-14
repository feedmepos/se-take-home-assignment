#!/bin/bash

# Run Script
# Executes the CLI application demo and writes results to scripts/result.txt

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Running CLI application..."

FEEDME_PROCESSING_TIME="${FEEDME_PROCESSING_TIME:-300ms}" ./bin/feedme demo > scripts/result.txt

cat scripts/result.txt

echo "CLI application execution completed"
