#!/bin/bash

set -e

echo "Running unit tests..."
go test ./internal/... -v
echo "Unit tests completed"
