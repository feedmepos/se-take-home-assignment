#!/bin/bash
set -e

echo "=== Running McDonald's Order CLI Tests ==="
# Simple functional test (simulate user input)
TEST_INPUT=$(cat <<EOF
normal
vip
addbot
status
rmbot
exit
EOF
)

# Execute test and output to result.txt
echo "$TEST_INPUT" | node src/index.js

# Verify result.txt exists and contains key content
if [ -f result.txt ]; then
  echo "Checking result.txt content..."
  if grep -q "Created NORMAL Order" result.txt && grep -q "Created VIP Order" result.txt && grep -q "Added new Bot" result.txt; then
    echo "Tests passed ✅"
    exit 0
  else
    echo "Test failed: result.txt missing critical content"
    exit 1
  fi
else
  echo "Test failed: result.txt not generated"
  exit 1
fi