#!/bin/bash
set -e
cd "$(dirname "$0")/.."
go build -o obot .
echo "Build successful"
