#!/bin/bash
# Add local Go to PATH
export PATH=$PATH:$(pwd)/tools/go/bin

echo "Starting Web Application..."

# Start Backend in background
cd backend
if command -v go &> /dev/null; then
    echo "Starting Backend Server on port 8080..."
    go run . &
    BACKEND_PID=$!
else
    echo "Error: 'go' command not found."
    exit 1
fi
cd ..

# Wait a moment for backend to initialize
sleep 2

# Start Frontend
cd frontend
if command -v npm &> /dev/null; then
    echo "Starting Frontend..."
    echo "Press CTRL+C to stop both servers."
    npm run dev
else
    echo "Error: 'npm' command not found."
    kill $BACKEND_PID
    exit 1
fi
cd ..

# Cleanup function to kill backend when script exits
trap "kill $BACKEND_PID" EXIT
