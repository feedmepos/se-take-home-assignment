#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

# For Go projects:
# go test ./... -v
(
  echo "new-normal"
  echo "new-normal"
  echo "new-vip"
  echo "new-vip"
  echo "status"
  echo "add-bot"
  echo "add-bot"
  echo "remove-bot"
  sleep 43
  echo "exit"
) | node index.js

sleep 2

if grep -q "completed" scripts/result.txt; then
  echo "Test Passed"
  exit 0
else
  echo "Test Failed"
  exit 1
fi
# For Node.js projects:
# npm test

echo "Unit tests completed"
