#!/bin/bash
# ABOUTME: Runs the Go test suite for the order controller CLI.
# ABOUTME: Provides the test entrypoint used by the backend verification workflow.

set -euo pipefail

echo "Running unit tests..."

go test ./... -v

echo "Unit tests completed"
