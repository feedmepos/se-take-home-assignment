#!/bin/bash

# Run Script - Run McDonald's Order Controller (demo mode by default)
# Usage:
#   ./run.sh                # Auto-detect OS, run demo mode
#   ./run.sh --windows      # Run Windows binary
#   ./run.sh --mac          # Run macOS binary
#   ./run.sh --linux        # Run Linux binary
#   ./run.sh --web          # Run web server mode (auto-detect OS)
#   ./run.sh --mac --web    # Run macOS binary in web mode

set -e

# Parse arguments
TARGET=""
MODE="--demo"
for arg in "$@"; do
    case "$arg" in
        --windows) TARGET="windows" ;;
        --mac)     TARGET="darwin" ;;
        --linux)   TARGET="linux" ;;
        --web)     MODE="--web" ;;
    esac
done

# Auto-detect OS if not specified
if [ -z "$TARGET" ]; then
    case "$(uname -s)" in
        Linux*)  TARGET="linux" ;;
        Darwin*) TARGET="darwin" ;;
        MINGW*|MSYS*|CYGWIN*) TARGET="windows" ;;
        *)       TARGET="linux" ;;
    esac
fi

# Determine binary name
BIN_NAME="order-controller"
if [ "$TARGET" = "windows" ]; then
    BIN_NAME="order-controller.exe"
fi

BIN_PATH="bin/${BIN_NAME}"

# Always rebuild to ensure binary is up-to-date
echo "Building for ${TARGET}..."
mkdir -p bin
GOOS=${TARGET} GOARCH=amd64 go build -o "${BIN_PATH}" ./cmd/main.go

echo "Running order-controller (${MODE})..."

if [ "$MODE" = "--demo" ]; then
    mkdir -p scripts
    ./"$BIN_PATH" --demo > scripts/result.txt 2>&1
    echo "Demo completed. Results written to scripts/result.txt"
    cat scripts/result.txt
else
    ./"$BIN_PATH" ${MODE}
fi
