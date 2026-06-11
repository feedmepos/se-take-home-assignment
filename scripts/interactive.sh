#!/bin/bash

# Interactive Mode Script
# This script runs the CLI application in interactive mode

echo "Starting interactive mode..."

cd "$(dirname "$0")/.."

./order-controller --interactive
