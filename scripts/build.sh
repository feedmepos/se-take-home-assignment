#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Installing dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Build completed"
