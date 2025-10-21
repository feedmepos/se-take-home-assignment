#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
# ./order-controller > result.txt

# For Node.js projects:
# node index.js > result.txt
# or npm start > result.txt

# -----------------------------------------
# McDonald's Order Management API Simulation
# -----------------------------------------

SERVER_FILE="src/app.js"
SIM_FILE="src/simulate.js"
RESULT_FILE="scripts/result.txt"

# Step 1: Remove old results
if [ -f "$RESULT_FILE" ]; then
  echo "Removing old result.txt..."
  rm $RESULT_FILE
fi

# Step 2: Start the backend server in the background
echo "Starting server..."
node "$SERVER_FILE" > "$RESULT_FILE" 2>&1 &
SERVER_PID=$!
sleep 2  # Give it a moment to boot up

# Step 3: Run the simulation script
echo "Running API simulation..."
node "$SIM_FILE" > "$RESULT_FILE"

# Step 4: Stop the server
echo "Stopping server..."
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null

# Step 5: Confirm results
if [ -f "$RESULT_FILE" ]; then
  echo ""
  echo "Simulation complete! Results saved to result.txt"
  echo ""
  echo "Preview (last 10 lines):"
  tail -n 10 "$RESULT_FILE"
else
  echo "Simulation failed — result.txt not found."
  exit 1
fi
