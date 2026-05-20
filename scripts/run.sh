#!/bin/bash

cd "$(dirname "$0")/.."
echo "Running CLI; writing scripts/result.txt ..."
node src/main.js > scripts/result.txt
echo "CLI finished."
echo "scripts/result.txt:"
cat scripts/result.txt
