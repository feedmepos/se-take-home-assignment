#!/bin/bash
echo "Running CLI application..."
cd backend && ./order-controller > ../scripts/result.txt
echo "CLI application execution completed"
