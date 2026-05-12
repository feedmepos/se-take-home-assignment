#!/bin/bash

echo "Running unit tests..."
cd "$(dirname "$0")/.."
npm test
echo "Unit tests completed"
