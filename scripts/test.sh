#!/bin/bash
set -e
cd "$(dirname "$0")/.."
go vet ./...
go test ./... -v -race -timeout 60s 2>/dev/null || go test ./... -v -timeout 60s
