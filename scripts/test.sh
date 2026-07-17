#!/bin/bash

set -euo pipefail

echo "Running unit tests..."
go test ./... -v

echo "Unit tests completed"
