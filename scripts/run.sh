#!/bin/bash

echo "Running McDonald's Order Management System..."
echo ""

(
  # Create normal orders
  echo "1"
  sleep 1
  echo "1"
  sleep 1
  echo "1"
  sleep 1

  # Create VIP orders
  echo "2"
  sleep 1
  echo "2"
  sleep 1

  # Add first bot
  echo "3"
  sleep 1

  # Wait a moment, then add second bot
  sleep 2
  echo "3"
  sleep 1

  # Wait for orders to process
  sleep 12

  # Exit and log final status
  echo "6"

) | go run main.go

echo ""
echo "Application completed. Results logged to scripts/result.txt"

