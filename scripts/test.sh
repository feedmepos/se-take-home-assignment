#!/bin/bash
# Unit Test Script - runs the Node.js test suite (fast, fake-timer based).
set -e

echo "Running unit tests..."
npm test
echo "Unit tests completed"
