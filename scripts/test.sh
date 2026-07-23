#!/bin/bash
echo "Running unit tests..."
go test ./... -v -race
echo "Unit tests completed"
