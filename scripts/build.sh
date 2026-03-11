#!/usr/bin/env bash
# build.sh — Validate that Node.js is available and syntax-check all source files
set -e

echo "Checking Node.js version..."
node --version

echo "Syntax-checking source files..."
node --check src/OrderController.js
node --check src/Logger.js
node --check src/index.js
node --check src/tests.js

echo "Build OK ✅"
