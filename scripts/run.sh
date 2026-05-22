#!/bin/bash

# McDonald's Order Management System - Run Script
# Starts the application, runs test scenarios, and saves output logs

set -o pipefail

mkdir -p scripts

# Save application logs to result.txt
save_logs() {
  local fail_if_missing=${1:-false}
  
  if [ -f scripts/app.log ]; then
    cp scripts/app.log scripts/result.txt
    echo "Results saved to scripts/result.txt"
  else
    echo "WARNING: No application logs found at scripts/app.log"
    if [ "$fail_if_missing" = true ]; then
      exit 1
    fi
  fi
}

# Gracefully shutdown a process and its children
graceful_shutdown() {
  local pid=$1
  local timeout=${2:-10}
  
  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  
  # Send SIGTERM to process group
  kill -TERM -- -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  
  # Wait for graceful shutdown
  for i in $(seq 1 "$timeout"); do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "Process stopped gracefully"
      return 0
    fi
    sleep 1
  done
  
  # Force kill if still running
  if kill -0 "$pid" 2>/dev/null; then
    echo "Process still running after ${timeout}s, forcing kill..."
    kill -9 -- -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  fi
}

# Cleanup handler for script termination
cleanup() {
  trap - INT TERM EXIT
  
  if [ -n "$APP_PID" ]; then
    echo ""
    echo "Cleaning up background process (PID: $APP_PID)..."
    graceful_shutdown "$APP_PID" 10
    sleep 1
    save_logs false
  fi
  exit
}

trap cleanup INT TERM EXIT

# Start application in background
echo "Starting application in background..."
if command -v setsid > /dev/null 2>&1; then
  setsid npm run start:prod > scripts/app.log 2>&1 &
  APP_PID=$!
else
  set -m
  npm run start:prod > scripts/app.log 2>&1 &
  APP_PID=$!
  set +m
fi
echo "Application started with PID: $APP_PID"

# Wait for application to be ready
echo "Waiting for application to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/bot > /dev/null; then
    echo "Application is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Application failed to start within 30 seconds"
    echo "Application logs:"
    cat scripts/app.log 2>/dev/null || echo "No logs available"
    exit 1
  fi
  echo "Waiting... ($i/30)"
  sleep 1
done

# Run test scenario
echo -e "\n=== Making API calls to the application ==="

echo -e "\n1. Creating 2 normal orders..."
curl -s -X POST http://localhost:3000/api/order/normal
echo ""
curl -s -X POST http://localhost:3000/api/order/normal

echo -e "\n\n2. Creating a VIP order..."
curl -s -X POST http://localhost:3000/api/order/vip

echo -e "\n\n3. Creating another 2 normal orders..."
curl -s -X POST http://localhost:3000/api/order/normal
echo ""
curl -s -X POST http://localhost:3000/api/order/normal

echo -e "\n\n4. Checking all orders..."
curl -s http://localhost:3000/api/order

echo -e "\n\n5. Adding 2 bots..."
curl -s -X POST http://localhost:3000/api/bot
echo ""
curl -s -X POST http://localhost:3000/api/bot

echo -e "\n\n6. Checking bot status..."
curl -s http://localhost:3000/api/bot

echo -e "\n\n7. Waiting 60 seconds for order processing..."
for i in $(seq 60 -1 1); do
  printf "\rTime remaining: %2d seconds..." "$i"
  sleep 1
done

echo -e "\n\n8. Checking final status..."
curl -s http://localhost:3000/api/order
echo ""
curl -s http://localhost:3000/api/bot

# Shutdown application and capture logs
echo -e "\n\nStopping application (PID: $APP_PID)..."
trap - EXIT
graceful_shutdown "$APP_PID" 10
sleep 2

echo -e "\n=== Saving results to result.txt ==="
save_logs true

echo -e "\n=== Application Console Logs ==="
cat scripts/app.log

echo -e "\nCLI application execution completed"
