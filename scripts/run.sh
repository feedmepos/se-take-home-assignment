#!/bin/bash
set -e

# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "Starting McDonald's Order System..."

# 1. Start backend
echo "Starting Backend (Go API) on :8080..."
go run cmd/api/main.go &
BACKEND_PID=$!

# 2. Wait a bit for backend to start up
sleep 2

# 3. Start frontend
echo "Starting Frontend (Next.js) on :3000..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "------------------------------------------------"
echo "McDonald's Order System is running!"
echo "Backend: http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both servers."
echo "------------------------------------------------"

# Keep the script running
wait $BACKEND_PID $FRONTEND_PID