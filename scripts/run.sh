#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
# ./order-controller > result.txt

# For Node.js projects:
# node index.js > result.txt
# or npm start > result.txt
plus_bot_count=0

while read input; do

  if [[ "$input" == "+bot"* ]]; then
    ((plus_bot_count++))
  fi

  if [[ "$input" == "-bot"* ]]; then
    sleep 2
  elif [[ "$plus_bot_count" -eq 3 ]]; then
    sleep 8
  elif [[ "$input" == "exit"* ]]; then
    sleep 41
  else
    sleep 0.5
  fi

  echo "$input"
done < input.txt | npm start

echo "CLI application execution completed"