#!/bin/bash
set -e

echo "Running Go unit tests..."

# 执行所有 Go 单元测试
go test ./... -v

echo "Unit tests completed"

