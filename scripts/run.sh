#!/bin/bash

# Run Script for McDonald's Order Management System
echo "Running CLI application..."

# Ensure the application is built
if [ ! -d "dist" ]; then
    echo "Application not built. Building now..."
    npm run build
fi

# Clear any existing result.txt
rm -f result.txt

# Run the NestJS CLI application
echo "Starting McDonald's Order Management System..."
RUN_MODE=cli npm start

echo "CLI application execution completed"