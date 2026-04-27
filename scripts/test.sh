#!/bin/bash
set -e

echo "Running unit tests..."
go test -race ./...
echo "Unit tests completed"
