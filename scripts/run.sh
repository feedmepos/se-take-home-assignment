#!/bin/bash
set -e
# Clear previous result
> scripts/result.txt
# Pipe demo commands for non-interactive (CI) run; result goes to scripts/result.txt
printf 'new normal\nnew vip\nadd bot\nnew normal\nadd bot\nremove bot\nstatus\nexit\n' \
  | node src/index.js --cli
cat scripts/result.txt
