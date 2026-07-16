#!/bin/bash
set -euo pipefail

echo "Running unit tests..."
go test ./internal/order/ -v -count=1 \
  -run 'Test(Create|VIP|Add|Bot|Remove|Order|Empty|Queue)'

echo ""
echo "Running Backend E2E tests..."
go test ./internal/order/ -v -count=1 -run 'TestE2E_'

echo ""
echo "All tests completed"
