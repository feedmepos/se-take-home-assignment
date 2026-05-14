#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Running unit tests..."
npx jest

echo "Unit tests completed"
