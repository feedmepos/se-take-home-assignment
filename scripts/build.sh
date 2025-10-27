#!/bin/bash

# Build Script for McMocknald Order Kiosk System
# Compiles the Go API server executable for Windows environment

set -e  # Exit on error

echo "========================================"
echo "McMocknald Order Kiosk - Build Script"
echo "========================================"
echo ""

# Get the project root (parent of scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Project Root: $PROJECT_ROOT"
echo "Go Version: $(go version)"
echo ""

# Navigate to project root
cd "$PROJECT_ROOT"

# Output binary details
OUTPUT_DIR="$PROJECT_ROOT/bin"
OUTPUT_NAME="mcmocknald-api.exe"
OUTPUT_PATH="$OUTPUT_DIR/$OUTPUT_NAME"

echo "Building CLI application..."
echo "Output: $OUTPUT_PATH"
echo ""

# Create bin directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Build the Go application
# GOOS=windows for Windows compatibility
# -o specifies output path
# cmd/api/main.go is the main entry point
go build -v -o "$OUTPUT_PATH" "$PROJECT_ROOT/cmd/api/main.go"

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Build completed successfully!"
    echo "========================================"
    echo "Executable: $OUTPUT_PATH"
    echo "Size: $(du -h "$OUTPUT_PATH" | cut -f1)"
    echo ""

    # Verify executable exists
    if [ -f "$OUTPUT_PATH" ]; then
        echo "Verification: Executable exists and is ready to run"
        exit 0
    else
        echo "ERROR: Build reported success but executable not found!"
        exit 1
    fi
else
    echo ""
    echo "========================================"
    echo "Build FAILED!"
    echo "========================================"
    exit 1
fi
