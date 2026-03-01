#!/bin/bash

# Execution steps that run the CLI application
(
echo "add order"
sleep 2
echo "add order"
sleep 3
echo "add vip order"
sleep 1
echo "add order"
sleep 4
echo "add bot"
sleep 1
echo "add bot"
sleep 5
echo "remove bot"
sleep 3
echo "add vip order"
sleep 60
echo "exit"
) | ./feedme-cli
