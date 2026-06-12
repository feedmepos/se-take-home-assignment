#!/bin/bash

# Build Script - Cross-platform compilation for McDonald's Order Controller
# Usage:
#   ./build.sh              # Auto-detect current OS
#   ./build.sh --windows    # Build for Windows
#   ./build.sh --mac        # Build for macOS
#   ./build.sh --linux      # Build for Linux

set -e

# Parse target OS
TARGET=""
case "${1}" in
    --windows) TARGET="windows" ;;
    --mac)     TARGET="darwin" ;;
    --linux)   TARGET="linux" ;;
    "")
        # Auto-detect
        case "$(uname -s)" in
            Linux*)  TARGET="linux" ;;
            Darwin*) TARGET="darwin" ;;
            MINGW*|MSYS*|CYGWIN*) TARGET="windows" ;;
            *)       TARGET="linux" ;;
        esac
        ;;
    *)
        echo "Usage: ./build.sh [--windows|--mac|--linux]"
        exit 1
        ;;
esac

# Set output binary name
BIN_NAME="order-controller"
if [ "$TARGET" = "windows" ]; then
    BIN_NAME="order-controller.exe"
fi

OUTPUT_DIR="bin"
mkdir -p "$OUTPUT_DIR"

echo "Building for ${TARGET}..."
GOOS=${TARGET} GOARCH=amd64 go build -o "${OUTPUT_DIR}/${BIN_NAME}" ./cmd/main.go

echo "Build completed: ${OUTPUT_DIR}/${BIN_NAME}"
