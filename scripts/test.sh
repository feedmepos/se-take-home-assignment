#!/bin/bash
echo "Running unit tests..."
cd backend && go test ./... -v
echo "Unit tests completed"
