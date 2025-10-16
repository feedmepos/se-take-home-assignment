#!/bin/bash

echo "Running unit tests..."
npm ci
npm test -- --runInBand
echo "Unit tests completed"
