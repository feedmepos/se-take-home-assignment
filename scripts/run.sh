#!/bin/bash

# Run Script for McMocknald Order Kiosk System
# Executes the CLI application and pipes logs to result.txt
# Usage: ./run.sh [WAIT_TIME]
#   - WAIT_TIME: Optional wait time in seconds (default: 600 for 10 minutes)
#   - Examples:
#     ./run.sh       # Runs for 10 minutes (600 seconds)
#     ./run.sh 30    # Runs for 30 seconds (CI mode)
#     ./run.sh 120   # Runs for 2 minutes

set -e  # Exit on error

# Parse command-line arguments
# Allow environment variable override for CI/CD flexibility
WAIT_TIME="${1:-${RUN_WAIT_TIME:-600}}"

# Validate wait time is a positive integer
if ! [[ "$WAIT_TIME" =~ ^[0-9]+$ ]] || [ "$WAIT_TIME" -le 0 ]; then
    echo "ERROR: WAIT_TIME must be a positive integer (seconds)"
    echo "Usage: ./run.sh [WAIT_TIME]"
    exit 1
fi

echo "========================================"
echo "McMocknald Order Kiosk - Run Script"
echo "========================================"
echo ""

# Get the project root (parent of scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Define paths
EXECUTABLE="$PROJECT_ROOT/bin/mcmocknald-api.exe"
LOGS_DIR="$PROJECT_ROOT/logs"
RESULT_FILE="$SCRIPT_DIR/result.txt"

echo "Project Root: $PROJECT_ROOT"
echo "Executable: $EXECUTABLE"
echo "Logs Directory: $LOGS_DIR"
echo "Result File: $RESULT_FILE"
echo "Wait Time: $WAIT_TIME seconds ($(($WAIT_TIME / 60)) minutes $(($WAIT_TIME % 60)) seconds)"
echo ""

# Verify executable exists
if [ ! -f "$EXECUTABLE" ]; then
    echo "ERROR: Executable not found at $EXECUTABLE"
    echo "Please run build.sh first to compile the application."
    exit 1
fi

# Get current date in the log file format: DD-MM-YYYY
CURRENT_DATE=$(date +"%d-%m-%Y")
LOG_FILE="$LOGS_DIR/orders-$CURRENT_DATE.log"

echo "Expected log file: $LOG_FILE"
echo ""

# Check if logs directory exists
if [ ! -d "$LOGS_DIR" ]; then
    echo "WARNING: Logs directory does not exist. Creating it..."
    mkdir -p "$LOGS_DIR"
fi

echo "========================================"
echo "Starting CLI Application..."
echo "========================================"
echo ""
echo "The application will run and generate logs for the next $WAIT_TIME seconds."
echo "Press Ctrl+C to stop the application."
echo ""

# Run the executable in the background
# The application will log to the file automatically
"$EXECUTABLE" &
APP_PID=$!

echo "Application started with PID: $APP_PID"
echo ""

# Wait a few seconds for the application to start and generate logs
echo "Waiting for application to initialize and generate logs..."
sleep 5

# Check if the application is still running
if ! kill -0 $APP_PID 2>/dev/null; then
    echo "ERROR: Application stopped unexpectedly!"
    echo "Check the logs for details."
    exit 1
fi

echo "Application is running. Waiting for log generation..."
sleep $WAIT_TIME

# Stop the application gracefully
echo ""
echo "Stopping application (PID: $APP_PID)..."
kill -SIGTERM $APP_PID 2>/dev/null || true

# Wait for graceful shutdown
sleep 2

# Force kill if still running
if kill -0 $APP_PID 2>/dev/null; then
    echo "Force stopping application..."
    kill -9 $APP_PID 2>/dev/null || true
fi

echo "Application stopped."
echo ""

# Copy log file to result.txt
echo "========================================"
echo "Copying logs to result.txt..."
echo "========================================"
echo ""

if [ -f "$LOG_FILE" ]; then
    # Copy the log file content to result.txt
    cp "$LOG_FILE" "$RESULT_FILE"

    echo "Log file successfully copied to: $RESULT_FILE"
    echo ""
    echo "Log file size: $(du -h "$LOG_FILE" | cut -f1)"
    echo "Result file size: $(du -h "$RESULT_FILE" | cut -f1)"
    echo ""

    # Display first 20 lines and last 20 lines of the result
    echo "========================================"
    echo "First 20 lines of result.txt:"
    echo "========================================"
    head -n 20 "$RESULT_FILE"
    echo ""
    echo "..."
    echo ""
    echo "========================================"
    echo "Last 20 lines of result.txt:"
    echo "========================================"
    tail -n 20 "$RESULT_FILE"
    echo ""

    echo "========================================"
    echo "CLI application execution completed"
    echo "========================================"
    echo "Full results available in: $RESULT_FILE"
else
    echo "WARNING: Log file not found at $LOG_FILE"
    echo "The application may not have generated logs yet."
    echo ""
    echo "Creating placeholder result.txt..."
    echo "No log file found for date: $CURRENT_DATE" > "$RESULT_FILE"
    echo "Expected log file: $LOG_FILE" >> "$RESULT_FILE"
    echo "Check if the application is configured to log to the correct directory." >> "$RESULT_FILE"
    exit 1
fi
