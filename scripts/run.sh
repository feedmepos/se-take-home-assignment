#!/bin/bash

echo "Running CLI..."
npm run build
{
  # Initial mix of orders
  echo "normal order"
  echo "normal order"
  echo "vip order"

  # Spin up 5 bots
  echo "+bot"
  echo "+bot"
  echo "+bot"
  echo "+bot"
  echo "+bot"

  # Let bots start working
  sleep 3

  # Introduce another VIP to test preemption
  echo "vip order"

  # After some time, remove the newest bot while processing
  sleep 5
  echo "-bot"

  # Add more work while one bot remains
  echo "normal order"
  echo "vip order"
  echo "normal order"
  echo "normal order"
  echo "vip order"

  # Burst more work to stress queueing
  for i in {1..5}
  do
    echo "normal order"
  done
  for i in {1..3}
  do
    echo "vip order"
  done

  # Allow enough time to process queue
  sleep 60
  echo "state"
  echo "quit"
} | node dist/index.js
echo "CLI finished."
