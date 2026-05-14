#!/bin/bash
set -e

echo "=========================================="
echo "Building McDonald's Order Management System"
echo "=========================================="
echo ""

echo "[1/3] Installing dependencies..."
npm install
cd client && npm install && cd ..
echo "✓ Dependencies installed"
echo ""

echo "[2/3] Building server..."
npm run server:build
echo "✓ Server built successfully"
echo ""

echo "[3/3] Building client..."
npm run client:build
echo "✓ Client built successfully"
echo ""

echo "=========================================="
echo "✓ Build completed successfully!"
echo "=========================================="
