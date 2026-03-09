#!/bin/bash
set -e

# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Building Backend (Go)..."
go build -o order-controller ./cmd/api/main.go

echo "Building Frontend (Next.js)..."
cd frontend && npm run build

echo "Builds completed successfully!"