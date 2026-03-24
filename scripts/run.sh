#!/bin/bash
set -e
# Clear previous result
> scripts/result.txt
# Pipe demo commands for non-interactive (CI) run; result goes to scripts/result.txt
printf '+order\n+vip\n+bot\n+order\n+bot\n-bot\nstatus\nexit\n' \
  | node src/index.js --cli
cat scripts/result.txt
