#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Running unit tests..."
npm test

echo "Unit tests completed"
