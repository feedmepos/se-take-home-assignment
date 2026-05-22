#!/bin/bash

echo "Running CLI application..."

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

# Clear previous results
> scripts/result.txt

# Check for interactive mode flag
# ./run.sh -i for interactive mode
if [ "$1" = "-i" ] || [ "$1" = "--interactive" ]; then
    echo "Running in interactive mode..."
    ./order-controller > scripts/result.txt
else
    echo "Running in demo mode..."
    ./order-controller -demo > scripts/result.txt
fi

echo "CLI application execution completed"