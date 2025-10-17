#!/bin/bash

# Run Script
# This script starts the mock backend web service

echo "Starting mock backend web service..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/mock_backend"

# Start the Node.js application
cd "$BACKEND_DIR"
node app.js
