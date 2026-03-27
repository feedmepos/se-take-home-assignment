#!/bin/bash
# run.sh

set -e

echo "Running CLI application..."

# Check if the binary exists, if not build it
if [ ! -f ./order-controller ]; then
    echo "Binary not found, building first..."
    ./build.sh
fi

# Run the application with a sample scenario
{
    echo "n"
    sleep 1
    echo "v"
    sleep 1
    echo "n"
    sleep 1
    echo "+"
    sleep 1
    echo "+"
    sleep 1
    echo "v"
    sleep 1
    echo "-"
    sleep 2
    echo "q"
} | ./order-controller > result.txt

echo "CLI application execution completed"