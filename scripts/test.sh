#!/bin/bash

cd "$(dirname "$0")/.."
echo "Running unit tests..."
node --test test/*.test.js
