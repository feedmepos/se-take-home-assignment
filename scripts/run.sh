#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Starting CLI simulation..." > result.txt

# Create orders
./mcd_order_bot new-normal >> result.txt
./mcd_order_bot new-vip >> result.txt
./mcd_order_bot new-normal >> result.txt
./mcd_order_bot new-vip >> result.txt

# Add bots
./mcd_order_bot +bot >> result.txt
./mcd_order_bot +bot >> result.txt

# Wait for processing
sleep 25

# Remove a bot
./mcd_order_bot -bot >> result.txt

# Add another order
./mcd_order_bot new-normal >> result.txt

# Add another bot
./mcd_order_bot +bot >> result.txt

# Wait for final processing
sleep 15

echo "Simulation complete at $(date +%T)" >> result.txt

# For Go projects:
# ./order-controller > result.txt


# For Node.js projects:
# node index.js > result.txt
# or npm start > result.txt

# Temporary placeholder - remove this when you implement your CLI
# ./mcd_order_bot "$@" >> result.txt
# echo "Added 1 bot" > result.txt
# echo "status: bot: [1], order: []" >> result.txt

echo "CLI application execution completed"