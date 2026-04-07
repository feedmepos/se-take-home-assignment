#!/bin/bash
echo "Building CLI application..."
npm install
./node_modules/.bin/tsc
echo "Build completed"