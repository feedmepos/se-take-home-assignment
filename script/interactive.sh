#!/bin/bash
set -e

# Interactive CLI Launcher
# This script builds the application and launches it in interactive demo mode

# 1. Build the application first
./script/build.sh

# 2. Launch the interactive CLI
./order-controller -interactive
