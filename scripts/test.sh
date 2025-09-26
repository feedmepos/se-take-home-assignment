#!/bin/bash

echo "Running unit tests..."

go test ./... -v

echo "Unit tests completed"
