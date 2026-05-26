#!/bin/bash
set -e

echo "Running unit tests..."
node scripts/order-controller.js --test
echo "Unit tests completed"
