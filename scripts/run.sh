#!/bin/bash

# Run Script
# Executes the demo CLI and writes output to result.txt.

set -e

echo "Running CLI application..."

go run ./cmd/demo/

echo "CLI application execution completed"
