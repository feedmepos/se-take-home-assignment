#!/bin/bash
set -e

# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Running Backend unit tests..."
go test ./... -v

echo "Running Frontend unit tests with coverage..."
cd frontend && npm run test:coverage

echo "All tests completed successfully!"
