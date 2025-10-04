#!/bin/bash

# Unit Test Script
# This script should contain all unit test execution steps

echo "Running unit tests..."

# For Go projects:
# go test ./... -v

# For Node.js projects:
# npm test

node tests/orderManager.test.js
node tests/botManager.test.js

echo -e "\n✅ Unit tests completed\n"
