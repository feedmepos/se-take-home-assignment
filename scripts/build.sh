#!/bin/bash
# Add local Go to PATH
export PATH=$PATH:$(pwd)/tools/go/bin


echo "Building Backend (Go)..."
cd backend
if command -v go &> /dev/null; then
    go build -o order-controller .
else
    echo "Warning: 'go' command not found. Skipping Go build."
fi
cd ..

echo "Building Frontend (Vue)..."
cd frontend
if command -v npm &> /dev/null; then
    npm install
else
    echo "Warning: 'npm' command not found. Skipping Frontend install."
fi
cd ..

echo "Build completed"