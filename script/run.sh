#!/bin/bash
# Run script for McDonald CLI

set -e

cd "$(dirname "$0")/.."

# Check if binary exists, if not build it
if [ ! -f "bin/mcdonald" ]; then
    echo "Binary not found, building..."
    ./script/build.sh
fi

# Run with demo input if provided
if [ -n "$1" ]; then
    echo "$1" | ./bin/mcdonald
else
    ./bin/mcdonald
fi
