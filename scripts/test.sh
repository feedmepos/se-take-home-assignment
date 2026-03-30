#!/bin/bash
set -e

# 单元测试脚本
echo "Running unit tests..."
cd src && go test ./... -v -race -count=1
echo "Unit tests completed"

# CLI 集成测试
echo "Running CLI integration tests..."
cd ../tests/cli && go test -v -count=1 -timeout 120s ./...
echo "CLI integration tests completed"
