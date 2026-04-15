#!/bin/bash

# Unit Test Script
# Runs all unit tests for the McDonald's Order Management System

echo "Running unit tests for McDonald's Order Management System..."
echo ""

go test -v ./mcdonald -timeout 60s

echo ""
echo "Unit tests completed!"
