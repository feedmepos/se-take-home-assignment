#!/bin/bash

# Run Script
# This script should execute your REST API application and output results to result.txt

echo "Installing dependencies..."
npm install

echo "Running REST API application..."

# For Go projects:
# ./order-controller > result.txt

# For Node.js projects:
npm run start:api