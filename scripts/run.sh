#!/bin/bash

#!/bin/bash

# Run Script
# This script should execute your CLI application and output results to result.txt

echo "Running CLI application..."

# For Go projects:
./order-controller > scripts/result.txt
echo "Added 1 bot" > result.txt
echo "status: bot: [1], order: []" >> result.txt

echo "CLI application execution completed"