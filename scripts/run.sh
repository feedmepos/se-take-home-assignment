#!/bin/bash
set -e

echo "=========================================="
echo "Starting McDonald's Order Management System"
echo "=========================================="
echo ""

# Check if build exists
if [ ! -d "dist/server" ] || [ ! -d "client/dist" ]; then
    echo "Build not found. Building..."
    bash scripts/build.sh
    echo ""
fi

echo "Starting server..."
echo "Server will run on http://localhost:3001"
echo "Frontend will be served from client/dist"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
