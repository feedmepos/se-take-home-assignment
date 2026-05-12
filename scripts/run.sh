
#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Node.js projects:
# Run the CLI application with sample commands
(
  echo "new-normal"
  echo "new-normal"
  echo "new-vip"
  echo "new-vip"
  echo "status"
  echo "add-bot"
  echo "add-bot"
  echo "remove-bot"
  sleep 43
  echo "exit"
) | node index.js

echo "CLI application execution completed"

# Display results
if [ -f "scripts/result.txt" ]; then
  echo "Results saved to scripts/result.txt"
  echo "------- Output -------"
  cat scripts/result.txt
fi